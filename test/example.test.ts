// The example app's route handlers and proxy, run as plain functions.
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET as aboutTwin } from "../examples/app-router/app/about/index.md/route";
import { GET as homeTwin } from "../examples/app-router/app/index.md/route";
import { GET as llmsTxt } from "../examples/app-router/app/llms.txt/route";
import { proxy } from "../examples/app-router/proxy";
import { lintLlmsTxt } from "../src";

describe("example app", () => {
  it("serves the /about twin as Markdown, canonical to the page", async () => {
    const res = aboutTwin();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(res.headers.get("link")).toBe('<https://example.com/about>; rel="canonical"');
    expect(res.headers.get("cache-control")).toMatch(/s-maxage=/);
    const md = await res.text();
    expect(
      md.startsWith("# About Example Co\n\nURL: https://example.com/about\nLast updated: 2026-10-02\n\n### Who we are"),
    ).toBe(true);
  });

  it("serves the home twin", async () => {
    expect(await homeTwin().text()).toContain("URL: https://example.com\n");
  });

  it("serves an llms.txt that lints clean and links every twin", async () => {
    const txt = await llmsTxt().text();
    expect(lintLlmsTxt(txt)).toEqual([]);
    expect(txt).toContain("- [About Example Co](https://example.com/about/index.md): Who we are and how we work.");
  });

  it("negotiates through the proxy", () => {
    const res = proxy(new NextRequest("https://example.com/about", { headers: { accept: "text/markdown" } }));
    expect(res.headers.get("x-middleware-rewrite")).toBe("https://example.com/about/index.md");
  });
});
