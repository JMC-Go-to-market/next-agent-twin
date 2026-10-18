import { describe, expect, it } from "vitest";
import { appendVary, defineTwins, normalizePath, shiftHeadings, TWIN_CONTENT_TYPE, wantsMarkdown } from "../src";

const index = defineTwins({ site: "https://example.com/" });
const suffix = defineTwins({ site: "https://example.com", style: "suffix" });

describe("twin URLs", () => {
  it("index style puts the twin at {path}/index.md, the home page at /index.md", () => {
    expect(index.twinPath("/")).toBe("/index.md");
    expect(index.twinPath("/about")).toBe("/about/index.md");
    expect(index.twinPath("/docs/intro/")).toBe("/docs/intro/index.md");
    expect(index.twinUrl("/about")).toBe("https://example.com/about/index.md");
  });

  it("suffix style puts the twin at {path}.md; the route stays {path}/index.md", () => {
    expect(suffix.twinPath("/")).toBe("/index.md");
    expect(suffix.twinPath("/about")).toBe("/about.md");
    expect(suffix.twinUrl("/docs/intro")).toBe("https://example.com/docs/intro.md");
    expect(suffix.routePath("/docs/intro")).toBe("/docs/intro/index.md");
  });

  it("page URLs drop the trailing slash; the home page is the bare origin", () => {
    expect(index.pageUrl("/")).toBe("https://example.com");
    expect(index.pageUrl("/about/")).toBe("https://example.com/about");
    expect(index.pageUrl("about")).toBe("https://example.com/about");
  });

  it("pagePathOf maps a public twin path back to its page, and nothing else", () => {
    expect(index.pagePathOf("/index.md")).toBe("/");
    expect(index.pagePathOf("/about/index.md")).toBe("/about");
    expect(index.pagePathOf("/about.md")).toBeNull();
    expect(index.pagePathOf("/about")).toBeNull();
    expect(suffix.pagePathOf("/about.md")).toBe("/about");
    expect(suffix.pagePathOf("/index.md")).toBe("/");
    expect(suffix.pagePathOf("/about/index.md")).toBeNull();
    expect(suffix.pagePathOf("/about")).toBeNull();
  });

  it("normalizePath", () => {
    expect(normalizePath("")).toBe("/");
    expect(normalizePath("/")).toBe("/");
    expect(normalizePath("//a//")).toBe("/a");
  });
});

describe("response", () => {
  it("serves Markdown with the page as canonical and Vary: Accept", async () => {
    const res = index.response("# Hi\n", "/about");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe(TWIN_CONTENT_TYPE);
    expect(TWIN_CONTENT_TYPE).toBe("text/markdown; charset=utf-8");
    expect(res.headers.get("link")).toBe('<https://example.com/about>; rel="canonical"');
    expect(res.headers.get("vary")).toBe("Accept");
    expect(res.headers.get("x-robots-tag")).toBeNull();
    expect(res.headers.get("cache-control")).toBeNull();
    expect(await res.text()).toBe("# Hi\n");
  });

  it("adds noindex and Cache-Control only when configured", () => {
    const t = defineTwins({ site: "https://example.com", noindex: true, cacheControl: "public, max-age=60" });
    const res = t.response("x", "/");
    expect(res.headers.get("x-robots-tag")).toBe("noindex");
    expect(res.headers.get("cache-control")).toBe("public, max-age=60");
    expect(res.headers.get("link")).toBe('<https://example.com>; rel="canonical"');
  });

  it("answers a plain-text 404 when there is no twin", async () => {
    const res = index.response(null, "/missing");
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toMatch(/^text\/plain/);
    expect(await res.text()).toBe("Not found\n");
  });
});

describe("alternates", () => {
  it("names the canonical page and the Markdown twin, keeping extra types", () => {
    expect(index.alternates("/about", { "text/plain": "https://example.com/llms.txt" })).toEqual({
      canonical: "https://example.com/about",
      types: { "text/markdown": "https://example.com/about/index.md", "text/plain": "https://example.com/llms.txt" },
    });
    expect(suffix.alternates("/about").types["text/markdown"]).toBe("https://example.com/about.md");
  });
});

describe("document", () => {
  it("leads with the title, URL and facts; page headings move one level down", () => {
    const md = index.document({
      title: "About  us",
      path: "/about",
      facts: { "Last updated": "2026-10-02" },
      body: "Intro\n\n# Big\n\n## Section\n\nText\n",
    });
    expect(md).toBe(
      "# About us\n\nURL: https://example.com/about\nLast updated: 2026-10-02\n\nIntro\n\n## Big\n\n### Section\n\nText\n",
    );
  });

  it("works with an empty body", () => {
    expect(index.document({ title: "T", path: "/", body: "  " })).toBe("# T\n\nURL: https://example.com\n");
  });
});

describe("shiftHeadings", () => {
  it("leaves fenced code alone and stops at H6", () => {
    expect(shiftHeadings("```\n# not a heading\n```\n# H")).toBe("```\n# not a heading\n```\n## H");
    expect(shiftHeadings("###### deep")).toBe("###### deep");
    expect(shiftHeadings("#hashtag")).toBe("#hashtag");
  });
});

describe("wantsMarkdown", () => {
  it("is true only when Accept names text/markdown with q > 0", () => {
    expect(wantsMarkdown("text/markdown")).toBe(true);
    expect(wantsMarkdown("text/markdown, text/html;q=0.8")).toBe(true);
    expect(wantsMarkdown("text/html, TEXT/MARKDOWN; q=0.5")).toBe(true);
    expect(wantsMarkdown("text/html,application/xhtml+xml,*/*;q=0.8")).toBe(false);
    expect(wantsMarkdown("text/markdown;q=0")).toBe(false);
    expect(wantsMarkdown("text/markdown;q=0.0")).toBe(false);
    expect(wantsMarkdown("")).toBe(false);
    expect(wantsMarkdown(null)).toBe(false);
    expect(wantsMarkdown(undefined)).toBe(false);
  });
});

describe("appendVary", () => {
  it("keeps what is there and adds each value once, case-insensitively", () => {
    const h = new Headers({ Vary: "rsc, accept-encoding" });
    appendVary(h, "Accept", "RSC", "Accept");
    expect(h.get("vary")).toBe("rsc, accept-encoding, Accept");
  });

  it("sets the header when there was none, and leaves it unset for no values", () => {
    const h = new Headers();
    appendVary(h);
    expect(h.get("vary")).toBeNull();
    appendVary(h, "Accept");
    expect(h.get("vary")).toBe("Accept");
  });
});
