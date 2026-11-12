import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // every route is prerendered, so the site ships as plain static files:
  // `next build` writes a ready-to-host `out/` folder (Netlify, GitHub Pages,
  // any static host, or a plain nginx drop).
  output: "export",
  // cacheComponents/partialPrefetching are intentionally off: they conflict
  // with the per-route `dynamic` config the static export needs on
  // /sitemap.xml and /robots.txt. The site is fully static anyway.
  // hides the floating dev-tools badge (the little warning bubble) on every page
  devIndicators: false,
  images: { unoptimized: true },
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
