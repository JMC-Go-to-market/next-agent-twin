import { describe, expect, it } from "vitest";
import { buildLlmsFullTxt, buildLlmsTxt, linkifyLlmsBullets, lintLlmsTxt } from "../src";

const O = "https://example.com";

describe("buildLlmsTxt", () => {
  const txt = buildLlmsTxt({
    title: "Example Co",
    summary: "Example Co makes\nexample widgets.",
    details: "Every page is also Markdown.",
    sections: [
      { title: "Docs", links: [{ title: "Intro [beta]", url: `${O}/intro`, description: "Start here." }] },
      { title: "Empty", links: [] },
    ],
    optional: [{ title: "Changelog", url: `${O}/changelog` }],
  });

  it("follows the llmstxt.org shape, Optional last, empty sections dropped", () => {
    expect(txt).toBe(
      [
        "# Example Co",
        "",
        "> Example Co makes example widgets.",
        "",
        "Every page is also Markdown.",
        "",
        "## Docs",
        "",
        `- [Intro \\[beta\\]](${O}/intro): Start here.`,
        "",
        "## Optional",
        "",
        `- [Changelog](${O}/changelog)`,
        "",
      ].join("\n"),
    );
  });

  it("passes its own lint", () => {
    expect(lintLlmsTxt(txt)).toEqual([]);
  });
});

describe("buildLlmsFullTxt", () => {
  it("writes every document in full under its own H2 with URL and facts", () => {
    const txt = buildLlmsFullTxt({
      title: "Example Co: all pages",
      docs: [
        { title: "One", url: `${O}/one`, body: "Body one.\n", facts: { Published: "2026-10-01" } },
        { title: "Two", url: `${O}/two`, body: "Body two." },
      ],
    });
    expect(txt).toBe(
      `# Example Co: all pages\n\n---\n\n## One\n\nURL: ${O}/one\nPublished: 2026-10-01\n\nBody one.\n\n---\n\n## Two\n\nURL: ${O}/two\n\nBody two.\n`,
    );
  });
});

describe("linkifyLlmsBullets", () => {
  it('turns "- /path - text" bullets into links, splitting "name: description"', () => {
    expect(linkifyLlmsBullets("- /pricing - Pricing (3 plans)", O)).toBe(`- [Pricing (3 plans)](${O}/pricing)`);
    expect(linkifyLlmsBullets("- /data - Dataset: facts, method and accuracy", `${O}/`)).toBe(
      `- [Dataset](${O}/data): facts, method and accuracy`,
    );
    const long = "A long description that has no short name before a colon and runs well past the limit for a name";
    expect(linkifyLlmsBullets(`- /long - ${long}`, O)).toBe(`- [/long](${O}/long): ${long}`);
    expect(linkifyLlmsBullets("- /x - Tools [beta]", O)).toBe(`- [/x](${O}/x): Tools [beta]`);
  });

  it('turns "- Name: /path" bullets into links', () => {
    expect(linkifyLlmsBullets("- Homepage: /", O)).toBe(`- [Homepage](${O}/)`);
    expect(linkifyLlmsBullets("- Privacy policy: /privacy", O)).toBe(`- [Privacy policy](${O}/privacy)`);
  });

  it("leaves everything else as it is", () => {
    const keep = [
      "# Example Co",
      "> Summary.",
      "- /docs/<slug> - one doc",
      "- GET /api/v1/items/<id> - one item",
      "- Name: Example Person",
      `- [Docs](${O}/docs): all docs`,
      "See /privacy.",
    ].join("\n");
    expect(linkifyLlmsBullets(keep, O)).toBe(keep);
  });
});

describe("lintLlmsTxt", () => {
  it("flags a missing H1, extra H1s, no sections, Optional not last and relative URLs", () => {
    expect(lintLlmsTxt("Title\n")).toEqual(["first line must be an H1 (# Title)", "no H2 sections"]);
    expect(lintLlmsTxt("# A\n# B\n## S\n- [x](https://example.com)")).toEqual(["exactly one H1 expected, found 2"]);
    expect(lintLlmsTxt("# A\n## Optional\n- [x](https://example.com)\n## Docs\n")).toEqual([
      '"## Optional" must be the last section',
    ]);
    expect(lintLlmsTxt("# A\n### Early\n## Docs\n- [x](/docs)")).toEqual([
      "headings before the first H2 section",
      "line 4: link URL is not absolute: /docs",
    ]);
  });
});
