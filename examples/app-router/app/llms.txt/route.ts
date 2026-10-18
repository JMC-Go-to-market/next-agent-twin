import { buildLlmsTxt } from "next-agent-twin";
import { PAGES } from "../../content/pages";
import { twins } from "../../lib/twins";

export const dynamic = "force-static";

export function GET() {
  const body = buildLlmsTxt({
    title: "Example Co",
    summary: "Example Co makes example widgets.",
    details:
      "Every page is also available as Markdown: add /index.md to its URL, or request it with Accept: text/markdown.",
    sections: [
      {
        title: "Pages",
        links: PAGES.map((p) => ({ title: p.title, url: twins.twinUrl(p.path), description: p.description })),
      },
    ],
    optional: [{ title: "Full corpus", url: "https://example.com/llms-full.txt" }],
  });
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
