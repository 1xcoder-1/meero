import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // hides the floating dev-tools badge (the little warning bubble) on every page
  devIndicators: false,
  turbopack: {
    // pin the workspace root to this folder (the repo root has its own lockfile)
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
