/**
 * Single source of truth for the public site origin.
 *
 * Everything that needs an absolute URL (Open Graph images, sitemap entries,
 * robots.txt) reads it from here, so pointing the site at a different domain
 * is a one-line change instead of a hunt through the codebase.
 */
export const SITE_URL = "https://meero.sh";

export const SITE_NAME = "meero";

export const SITE_TAGLINE = "turns plain English into shell commands";

export const SITE_DESCRIPTION =
  "An AI-powered CLI that converts natural language tasks into shell commands, inspects your system, generates the commands, guards the dangerous ones, runs them with your consent, and fixes itself when something fails.";

/** absolute url helper: "/docs" -> "https://meero.sh/docs" */
export function absoluteUrl(path = "/"): string {
  return new URL(path, SITE_URL).toString();
}
