import type { NextRequest } from "next/server";
import { twinProxy } from "next-agent-twin/next";
import { twins } from "./lib/twins";

export function proxy(request: NextRequest) {
  return twinProxy(twins, request);
}

// Page routes and .md twins only: skip Next internals, API routes and other files with an extension.
export const config = {
  matcher: ["/((?!_next/|api/|.*\\.(?!md$)[\\w]+$).*)"],
};
