import { defineTwins } from "@jmc-gtm/next-agent-twin";

export const twins = defineTwins({
  site: "https://example.com",
  // The smoke test builds the app once per style; a real app picks one.
  style: process.env.TWIN_STYLE === "suffix" ? "suffix" : "index",
  cacheControl: "public, max-age=3600, s-maxage=86400",
});
