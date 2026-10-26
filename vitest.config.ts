import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@jmc-gtm/next-agent-twin/next": fileURLToPath(new URL("./src/next.ts", import.meta.url)),
      "@jmc-gtm/next-agent-twin": fileURLToPath(new URL("./src/index.ts", import.meta.url)),
    },
  },
  test: {
    include: ["test/**/*.test.ts"],
  },
});
