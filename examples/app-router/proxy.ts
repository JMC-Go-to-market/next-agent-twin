import { twinProxy } from "@jmc-gtm/next-agent-twin/next";
import type { NextRequest } from "next/server";
import { twins } from "./lib/twins";

export function proxy(request: NextRequest) {
  return twinProxy(twins, request);
}

// Page routes and .md twins only: skip Next internals, API routes and other files with an extension.
export const config = {
  matcher: ["/((?!_next/|api/|.*\\.(?!md$)[\\w]+$).*)"],
};
