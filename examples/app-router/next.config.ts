import type { NextConfig } from "next";

// The example sits inside the package repo, which has its own lockfile; pin the app root.
const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  turbopack: { root: process.cwd() },
};

export default nextConfig;
