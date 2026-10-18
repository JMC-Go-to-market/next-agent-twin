// Next.js proxy (middleware) adapter: content negotiation and suffix-style rewrites.

import { type NextRequest, NextResponse } from "next/server.js";
import { appendVary, normalizePath, type Twins, wantsMarkdown } from "./twins.js";

/**
 * Request headers Next's App Router varies on (Next 16). On some hosts a Vary set in
 * the proxy replaces the one Next adds, so the default repeats them next to Accept.
 */
export const NEXT_ROUTER_VARY = [
  "rsc",
  "next-router-state-tree",
  "next-router-prefetch",
  "next-router-segment-prefetch",
] as const;

export type TwinProxyOptions = {
  /** Vary values sent with Accept on page responses. Default NEXT_ROUTER_VARY. */
  vary?: readonly string[];
};

function rewriteTo(request: NextRequest, pathname: string): NextResponse {
  // A fresh URL, not nextUrl.clone(): NextURL re-adds the request's trailing slash.
  const url = new URL(pathname, request.url);
  url.search = request.nextUrl.search;
  return NextResponse.rewrite(url);
}

/**
 * Call from `proxy.ts` (or `middleware.ts`). Returns a NextResponse you can add to
 * (cookies, headers) before returning it:
 * - a page request with `Accept: text/markdown` is rewritten to the page's twin route;
 * - in "suffix" style, `/about.md` is rewritten to the `/about/index.md` route;
 * - every page response varies on Accept.
 */
export function twinProxy(twins: Twins, request: NextRequest, options: TwinProxyOptions = {}): NextResponse {
  const pathname = request.nextUrl.pathname;
  const pageOfTwin = twins.pagePathOf(pathname);
  if (pageOfTwin !== null) {
    const route = twins.routePath(pageOfTwin);
    return normalizePath(pathname) === route ? NextResponse.next() : rewriteTo(request, route);
  }
  const response = wantsMarkdown(request.headers.get("accept"))
    ? rewriteTo(request, twins.routePath(pathname))
    : NextResponse.next();
  appendVary(response.headers, ...(options.vary ?? NEXT_ROUTER_VARY), "Accept");
  return response;
}
