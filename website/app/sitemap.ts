import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

/** Every docs page, in reading order. */
const DOCS_ROUTES = [
  "/docs",
  "/docs/installation",
  "/docs/quickstart",
  "/docs/configuration",
  "/docs/commands",
  "/docs/usage",
  "/docs/slash-commands",
  "/docs/reference",
  "/docs/builtins",
  "/docs/recipes",
  "/docs/safety",
  "/docs/history",
  "/docs/cheap-mode",
  "/docs/sandbox",
  "/docs/how-it-works",
  "/docs/development",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...DOCS_ROUTES.map((route) => ({
      url: absoluteUrl(route),
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
