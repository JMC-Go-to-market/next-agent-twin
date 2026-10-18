import { defineTwins } from "next-agent-twin";

export const twins = defineTwins({
  site: "https://example.com",
  style: "index",
  cacheControl: "public, max-age=3600, s-maxage=86400",
});
