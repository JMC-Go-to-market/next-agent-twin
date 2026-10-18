import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { defineTwins } from "../src";
import { NEXT_ROUTER_VARY, twinProxy } from "../src/next";

const index = defineTwins({ site: "https://example.com" });
const suffix = defineTwins({ site: "https://example.com", style: "suffix" });

const req = (path: string, accept?: string) =>
  new NextRequest(`https://example.com${path}`, { headers: accept ? { accept } : {} });
const rewrite = (res: Response) => res.headers.get("x-middleware-rewrite");

describe("twinProxy", () => {
  it("rewrites a page asked for as Markdown to its twin route, keeping the query", () => {
    expect(rewrite(twinProxy(index, req("/about", "text/markdown")))).toBe("https://example.com/about/index.md");
    expect(rewrite(twinProxy(index, req("/", "text/markdown")))).toBe("https://example.com/index.md");
    expect(rewrite(twinProxy(index, req("/docs/x/?v=1", "text/markdown")))).toBe(
      "https://example.com/docs/x/index.md?v=1",
    );
    expect(rewrite(twinProxy(suffix, req("/about", "text/markdown")))).toBe("https://example.com/about/index.md");
  });

  it("leaves a browser request alone and varies on Accept plus Next's router headers", () => {
    const res = twinProxy(index, req("/about", "text/html"));
    expect(rewrite(res)).toBeNull();
    expect(res.headers.get("vary")).toBe([...NEXT_ROUTER_VARY, "Accept"].join(", "));
  });

  it("takes a custom Vary list", () => {
    expect(twinProxy(index, req("/about"), { vary: [] }).headers.get("vary")).toBe("Accept");
  });

  it("suffix style rewrites /about.md to the route; index-style twin URLs pass straight through", () => {
    expect(rewrite(twinProxy(suffix, req("/about.md")))).toBe("https://example.com/about/index.md");
    expect(rewrite(twinProxy(suffix, req("/index.md")))).toBeNull();
    expect(rewrite(twinProxy(index, req("/about/index.md", "text/markdown")))).toBeNull();
  });
});
