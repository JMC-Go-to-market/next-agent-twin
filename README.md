# next-agent-twin

Give every Next.js App Router page a Markdown **agent twin**, and generate `llms.txt`.

An agent twin is the same page as clean Markdown: the content without navigation, scripts or layout. AI agents and assistants can read it without rendering HTML. The HTML page stays the canonical URL. This package covers the plumbing:

- **Twin URLs**: `/about/index.md` (default) or `/about.md`; the home page's twin is `/index.md`.
- **Twin responses**: `Content-Type: text/markdown; charset=utf-8`, `Link: <page>; rel="canonical"`, `Vary: Accept`, optional `X-Robots-Tag: noindex` and `Cache-Control`.
- **Content negotiation**: a request for the page URL with `Accept: text/markdown` gets the twin, and page responses vary on `Accept`.
- **Discovery**: `<link rel="alternate" type="text/markdown">` through Next's `metadata.alternates`.
- **A document frame**: title, URL, facts, then the page content with its headings moved one level down.
- **llms.txt**: builders for `llms.txt` and `llms-full.txt` in the [llmstxt.org](https://llmstxt.org) shape, plus a structural lint.

You supply the content. The package does not fetch data or convert HTML; each twin route renders the same data its page already reads.

## Install

```sh
npm install next-agent-twin
```

Requires Next.js 15 or later (`next` is a peer dependency). No runtime dependencies.

## Usage (App Router)

### 1. Configure once

```ts
// lib/twins.ts
import { defineTwins } from "next-agent-twin";

export const twins = defineTwins({
  site: "https://example.com",
  style: "index", // or "suffix" for /about.md
  cacheControl: "public, max-age=3600, s-maxage=86400", // optional
  noindex: false, // optional: X-Robots-Tag: noindex on twins
});
```

### 2. Add a twin route next to each page

Twin routes always live at `{page}/index.md/route.ts`, whatever the public style. Dynamic segments work: `app/blog/[slug]/index.md/route.ts`.

```ts
// app/about/index.md/route.ts
import { twins } from "@/lib/twins";
import { getPage } from "@/lib/content";

export const dynamic = "force-static";

export async function GET() {
  const page = await getPage("/about");
  const body = page
    ? twins.document({ title: page.title, path: "/about", facts: { "Last updated": page.updated }, body: page.markdown })
    : null;
  return twins.response(body, "/about"); // null -> 404
}
```

`twins.document()` returns:

```md
# About Example Co

URL: https://example.com/about
Last updated: 2026-10-02

### Who we are
...
```

### 3. Link the twin from the page

```ts
// app/about/page.tsx
export const metadata: Metadata = {
  title: "About",
  alternates: twins.alternates("/about", { "text/plain": "https://example.com/llms.txt" }),
};
```

This renders `<link rel="canonical">` and `<link rel="alternate" type="text/markdown" href="https://example.com/about/index.md">`.

Next replaces a layout's `alternates` wholesale when a page exports its own. Pass any shared types (feeds, `llms.txt`) through the second argument on every page.

### 4. Negotiate in the proxy

```ts
// proxy.ts (middleware.ts on Next 15)
import type { NextRequest } from "next/server";
import { twinProxy } from "next-agent-twin/next";
import { twins } from "@/lib/twins";

export function proxy(request: NextRequest) {
  const response = twinProxy(twins, request);
  // add your own cookies or headers here
  return response;
}

export const config = {
  matcher: ["/((?!_next/|api/|.*\\.[\\w]+$).*)"],
  // style "suffix": let .md through
  // matcher: ["/((?!_next/|api/|.*\\.(?!md$)[\\w]+$).*)"],
};
```

`twinProxy`:

- rewrites a page request with `Accept: text/markdown` (q > 0) to the page's twin route;
- in `"suffix"` style, rewrites `/about.md` to the `/about/index.md` route;
- adds `Accept` to `Vary` on page responses, together with Next's router headers (`NEXT_ROUTER_VARY`). Some hosts let a proxy's `Vary` replace the one Next sets, so the default repeats them. Pass `{ vary: [...] }` to change the list.

## llms.txt

```ts
// app/llms.txt/route.ts
import { buildLlmsTxt } from "next-agent-twin";
import { twins } from "@/lib/twins";

export const dynamic = "force-static";

export function GET() {
  const body = buildLlmsTxt({
    title: "Example Co",
    summary: "Example Co makes example widgets.",
    details: "Every page is also available as Markdown: add /index.md to its URL, or request it with Accept: text/markdown.",
    sections: [
      {
        title: "Pages",
        links: [
          { title: "Home", url: twins.twinUrl("/"), description: "What we do" },
          { title: "About", url: twins.twinUrl("/about"), description: "Who we are" },
        ],
      },
    ],
    optional: [{ title: "Full corpus", url: "https://example.com/llms-full.txt" }],
  });
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
```

Output:

```md
# Example Co

> Example Co makes example widgets.

Every page is also available as Markdown: add /index.md to its URL, or request it with Accept: text/markdown.

## Pages

- [Home](https://example.com/index.md): What we do
- [About](https://example.com/about/index.md): Who we are

## Optional

- [Full corpus](https://example.com/llms-full.txt)
```

Also exported:

- `buildLlmsFullTxt({ title, summary, docs })`: every document in full under its own H2.
- `linkifyLlmsBullets(body, origin)`: turns hand-written `- /path - text` and `- Name: /path` bullets into llmstxt.org links without dropping a word.
- `lintLlmsTxt(text)`: returns a list of structural problems (one H1 first, H2 sections, `Optional` last, absolute link URLs). Use it in a test.

## API

| Export | From | What it does |
|---|---|---|
| `defineTwins(config)` | `next-agent-twin` | Returns `pageUrl`, `twinPath`, `twinUrl`, `routePath`, `pagePathOf`, `response`, `alternates`, `document` bound to your site |
| `wantsMarkdown(accept)` | `next-agent-twin` | True when an Accept header asks for `text/markdown` with q > 0 |
| `appendVary(headers, ...values)` | `next-agent-twin` | Adds values to `Vary` without dropping or repeating existing ones |
| `shiftHeadings(md)` | `next-agent-twin` | Moves Markdown headings one level down, skipping fenced code |
| `buildLlmsTxt`, `buildLlmsFullTxt`, `linkifyLlmsBullets`, `lintLlmsTxt` | `next-agent-twin` | llms.txt helpers |
| `twinProxy(twins, request, options?)` | `next-agent-twin/next` | Proxy negotiation and suffix rewrites |
| `NEXT_ROUTER_VARY` | `next-agent-twin/next` | Next's App Router request headers for `Vary` |

## Example

`examples/app-router` is a minimal App Router app: a twin route for `/` and `/about`, `llms.txt`, page metadata and the proxy. The test suite runs its route handlers and proxy.

## Develop

```sh
npm ci
npm run check   # lint + typecheck + tests
npm run build
```

## License

MIT. Maintained by JMC Go-to-Market Systems.
