import type { NextRequest } from "next/server";
import { twinProxy } from "next-agent-twin/next";
import { twins } from "./lib/twins";

export function proxy(request: NextRequest) {
  return twinProxy(twins, request);
}

// Page routes only: skip Next internals, API routes and files with an extension.
// With style "suffix", let ".md" through as well: "/((?!_next/|api/|.*\\.(?!md$)[\\w]+$).*)".
export const config = {
  matcher: ["/((?!_next/|api/|.*\\.[\\w]+$).*)"],
};
