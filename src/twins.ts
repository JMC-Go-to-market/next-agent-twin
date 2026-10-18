// Agent twins: every page also served as Markdown, for AI agents and assistants.
// The HTML page stays the canonical URL; the twin is the same content without
// navigation, scripts or layout.

/**
 * Public URL of a twin.
 * - "index":  /about -> /about/index.md (works with App Router folders as is)
 * - "suffix": /about -> /about.md (needs the proxy to rewrite to the internal route)
 * The home page's twin is /index.md in both styles.
 */
export type TwinStyle = "index" | "suffix";

export type TwinConfig = {
  /** Site origin, e.g. "https://example.com". No trailing slash needed. */
  site: string;
  /** Public twin URL style. Default "index". */
  style?: TwinStyle;
  /** Send `X-Robots-Tag: noindex` on twin responses. Default false (the canonical Link is the signal). */
  noindex?: boolean;
  /** Cache-Control for twin responses. Omitted when not set. */
  cacheControl?: string;
};

export type TwinDocument = {
  title: string;
  /** Path of the HTML page this twin mirrors, e.g. "/about". */
  path: string;
  /** Extra "Label: value" lines after the URL line, in order. */
  facts?: Record<string, string>;
  /** Page content as Markdown. Its headings move one level down; the title is the only H1. */
  body: string;
};

export const TWIN_FILE = "index.md";
export const TWIN_CONTENT_TYPE = "text/markdown; charset=utf-8";

/** "/" stays "/"; any other path loses trailing slashes and gains a leading one. */
export function normalizePath(path: string): string {
  const p = `/${path.replace(/^\/+/, "")}`.replace(/\/+$/, "");
  return p || "/";
}

/** Push every Markdown heading one level down, leaving fenced code alone. */
export function shiftHeadings(body: string): string {
  let fenced = false;
  return body
    .split("\n")
    .map((line) => {
      if (line.startsWith("```")) fenced = !fenced;
      if (fenced || !/^#{1,5} /.test(line)) return line;
      return `#${line}`;
    })
    .join("\n");
}

/** Add values to a Vary header without dropping or repeating what is already there. */
export function appendVary(headers: Headers, ...values: string[]): void {
  const current = (headers.get("vary") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const seen = new Set(current.map((s) => s.toLowerCase()));
  for (const v of values) {
    if (!seen.has(v.toLowerCase())) {
      current.push(v);
      seen.add(v.toLowerCase());
    }
  }
  if (current.length) headers.set("vary", current.join(", "));
}

/** True when the Accept header asks for Markdown (and does not refuse it with q=0). */
export function wantsMarkdown(accept: string | null | undefined): boolean {
  if (!accept) return false;
  return accept.split(",").some((part) => {
    const [type, ...params] = part
      .trim()
      .toLowerCase()
      .split(";")
      .map((s) => s.trim());
    if (type !== "text/markdown") return false;
    const q = params.find((x) => x.startsWith("q="));
    return !q || Number(q.slice(2)) > 0;
  });
}

export function defineTwins(config: TwinConfig) {
  const site = config.site.replace(/\/+$/, "");
  const style = config.style ?? "index";

  /** Absolute URL of the page at `path` ("/" is the home page). */
  function pageUrl(path: string): string {
    const p = normalizePath(path);
    return p === "/" ? site : `${site}${p}`;
  }

  /** App route that serves the twin: always `{path}/index.md` (a `route.ts` in that folder). */
  function routePath(path: string): string {
    const p = normalizePath(path);
    return p === "/" ? `/${TWIN_FILE}` : `${p}/${TWIN_FILE}`;
  }

  /** Public path of the twin of the page at `path`. */
  function twinPath(path: string): string {
    const p = normalizePath(path);
    if (style === "index" || p === "/") return routePath(p);
    return `${p}.md`;
  }

  function twinUrl(path: string): string {
    return `${site}${twinPath(path)}`;
  }

  /** The page path a public twin path belongs to, or null when `pathname` is not a twin. */
  function pagePathOf(pathname: string): string | null {
    const p = normalizePath(pathname);
    if (p === `/${TWIN_FILE}`) return "/";
    if (p.endsWith(`/${TWIN_FILE}`)) return style === "index" ? p.slice(0, -TWIN_FILE.length - 1) : null;
    if (style === "suffix" && p.endsWith(".md")) return p.slice(0, -3) || "/";
    return null;
  }

  /** The response every twin route returns. A `null` body answers 404. */
  function response(body: string | null, path: string): Response {
    if (body === null) {
      return new Response("Not found\n", {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    const headers = new Headers({
      "Content-Type": TWIN_CONTENT_TYPE,
      // The HTML page stays the one URL search engines index and assistants cite.
      Link: `<${pageUrl(path)}>; rel="canonical"`,
      // The page URL itself also answers Markdown when asked (see the proxy).
      Vary: "Accept",
    });
    if (config.noindex) headers.set("X-Robots-Tag", "noindex");
    if (config.cacheControl) headers.set("Cache-Control", config.cacheControl);
    return new Response(body, { headers });
  }

  /**
   * Next metadata `alternates` for a page: its canonical URL plus the Markdown twin,
   * which Next renders as <link rel="alternate" type="text/markdown" href="...">.
   * Next replaces a layout's `alternates` wholesale when a page exports its own, so
   * pass any shared types (feeds, llms.txt) through `types` on every page.
   */
  function alternates(path: string, types: Record<string, string> = {}) {
    return {
      canonical: pageUrl(path),
      types: { "text/markdown": twinUrl(path), ...types },
    };
  }

  /** A twin document: the title, the URL and facts, then the page content. */
  function document({ title, path, facts = {}, body }: TwinDocument): string {
    const head = [`URL: ${pageUrl(path)}`, ...Object.entries(facts).map(([k, v]) => `${k}: ${v}`)];
    const parts = [`# ${title.replace(/\s+/g, " ").trim()}`, head.join("\n")];
    const content = shiftHeadings(body.trim());
    if (content) parts.push(content);
    return `${parts.join("\n\n")}\n`;
  }

  return { site, style, pageUrl, routePath, twinPath, twinUrl, pagePathOf, response, alternates, document };
}

export type Twins = ReturnType<typeof defineTwins>;
