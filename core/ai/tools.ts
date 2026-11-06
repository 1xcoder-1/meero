import { tool } from "ai";
import { z } from "zod";
import { readdirSync, readFileSync, existsSync, statSync } from "fs";
import { cwd, env } from "process";
import path from "path";
import { execFileSync } from "child_process";
import os from "os";
import * as cheerio from "cheerio";
import { withSpinner } from "../cli/ora";
import ora from "ora";

function resolvePath(p?: string) {
  if (!p) return cwd();
  if (p.startsWith("~"))
    return path.join(process.env.HOME || os.homedir(), p.slice(1));
  return path.resolve(p);
}

// Captured final answer from the returnCommands tool (structured output,
// replaces fragile regex parsing of the model's text)
let capturedCommands: string[] | null = null;

export function resetCapturedCommands() {
  capturedCommands = null;
}

export function getCapturedCommands() {
  return capturedCommands;
}

async function fetchAndParse(
  url: string,
  maxChars: number,
): Promise<
  | {
      url: string;
      title?: string;
      content: string;
      contentType: string;
      totalLength: number;
    }
  | { url: string; error: string }
> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; AI-Agent/1.0)",
      Accept: "text/html,application/xhtml+xml,*/*",
    },
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    return { url, error: `HTTP ${response.status}: ${response.statusText}` };
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const json = await response.text();
    return {
      url,
      content: json.slice(0, maxChars),
      contentType,
      totalLength: json.length,
    };
  }

  if (
    contentType.includes("text/plain") ||
    contentType.includes("text/markdown")
  ) {
    const text = await response.text();
    return {
      url,
      content: text.slice(0, maxChars),
      contentType,
      totalLength: text.length,
    };
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  $(
    "script, style, nav, footer, header, aside, iframe, noscript, [aria-hidden='true'], .cookie-banner, #cookie-banner",
  ).remove();

  const title = $("title").text().trim() || $("h1").first().text().trim();
  const mainSelectors = [
    "main",
    "article",
    '[role="main"]',
    ".content",
    "#content",
    ".post",
    ".article-body",
  ];
  let bodyText = "";
  for (const sel of mainSelectors) {
    const el = $(sel);
    if (el.length) {
      bodyText = el.text();
      break;
    }
  }
  if (!bodyText) bodyText = $("body").text();

  const clean = bodyText
    .replace(/\t/g, " ")
    .replace(/ {2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .filter((line) => line.trim().length > 40)
    .join("\n")
    .trim();
  // console.log({
  //   url,
  //   title,
  //   content: clean.slice(0, maxChars),
  //   contentType,
  //   totalLength: clean.length,
  // });
  return {
    url,
    title,
    content: clean.slice(0, maxChars),
    contentType,
    totalLength: clean.length,
  };
}

export type WebSearchResult = {
  title: string;
  url: string;
  snippet: string;
};

/** Quiet helper for the safety gate's web cross-check (no spinner UI) */
export async function webSearchTop(
  query: string,
  maxResults = 3,
): Promise<WebSearchResult[]> {
  return searchDuckDuckGo(query, maxResults);
}

async function searchDuckDuckGo(
  query: string,
  maxResults: number,
): Promise<{ title: string; url: string; snippet: string }[]> {
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const response = await fetch(searchUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; AI-Agent/1.0)",
      Accept: "text/html",
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) throw new Error(`Search failed: ${response.status}`);

  const html = await response.text();
  const $ = cheerio.load(html);
  const results: { title: string; url: string; snippet: string }[] = [];

  $(".result").each((_, el) => {
    if (results.length >= maxResults) return false;
    const titleEl = $(el).find(".result__title a");
    const snippetEl = $(el).find(".result__snippet");
    const rawHref = titleEl.attr("href") ?? "";

    let url = rawHref;
    try {
      const parsed = new URL("https://duckduckgo.com" + rawHref);
      url =
        parsed.searchParams.get("uddg") ||
        parsed.searchParams.get("u") ||
        rawHref;
    } catch {}

    const title = titleEl.text().trim();
    const snippet = snippetEl.text().trim();

    if (title && url && url.startsWith("http")) {
      results.push({ title, url, snippet });
    }
  });

  return results;
}

export const tools = {
  cwd: tool({
    description: "Get current working directory",
    inputSchema: z.object({}),
    execute: async () => withSpinner("cwd", async () => cwd()),
  }),

  os: tool({
    description: "Get OS platform and architecture",
    inputSchema: z.object({}),
    execute: async () =>
      withSpinner("os", async () => ({
        platform: os.platform(),
        arch: os.arch(),
      })),
  }),

  env: tool({
    description: "List environment variable names",
    inputSchema: z.object({}),
    execute: async () => withSpinner("env", async () => Object.keys(env)),
  }),

  listFiles: tool({
    description: "List files in a directory with metadata",
    inputSchema: z.object({ path: z.string().optional() }),
    execute: async ({ path: p }) =>
      withSpinner("listFiles", async () => {
        try {
          const dir = resolvePath(p);
          return readdirSync(dir).map((name) => {
            const full = path.join(dir, name);
            const stat = statSync(full);
            return {
              name,
              path: full,
              type: stat.isDirectory() ? "dir" : "file",
              ext: path.extname(name),
              size: stat.size,
            };
          });
        } catch (e) {
          return `Error: ${e instanceof Error ? e.message : String(e)}`;
        }
      }),
  }),

  readFile: tool({
    description: "Read file content (first 3000 chars)",
    inputSchema: z.object({ path: z.string() }),
    execute: async ({ path: p }) =>
      withSpinner("readFile", async () => {
        try {
          const full = resolvePath(p);
          return readFileSync(full, "utf-8").slice(0, 3000);
        } catch (e) {
          return `Error: ${e instanceof Error ? e.message : String(e)}`;
        }
      }),
  }),

  fileExists: tool({
    description: "Check if a file or directory exists",
    inputSchema: z.object({ path: z.string() }),
    execute: async ({ path: p }) =>
      withSpinner("fileExists", async () => existsSync(resolvePath(p))),
  }),

  readFileLines: tool({
    description: "Read specific lines from a file",
    inputSchema: z.object({
      path: z.string(),
      start: z.number().min(1).optional(),
      end: z.number().min(1).optional(),
    }),
    execute: async ({ path: p, start = 1, end }) =>
      withSpinner("readFileLines", async () => {
        try {
          const full = resolvePath(p);
          const lines = readFileSync(full, "utf-8").split("\n");
          const s = Math.max(start - 1, 0);
          const e = end ? Math.min(end, lines.length) : s + 50;
          return lines.slice(s, e).join("\n");
        } catch {
          return "";
        }
      }),
  }),

  gitStatus: tool({
    description: "Get git status (short)",
    inputSchema: z.object({}),
    execute: async () =>
      withSpinner("gitStatus", async () => {
        try {
          return execFileSync("git", ["status", "--short"], {
            encoding: "utf-8",
          });
        } catch {
          return "";
        }
      }),
  }),

  gitDiff: tool({
    description: "Get git diff",
    inputSchema: z.object({}),
    execute: async () =>
      withSpinner("gitDiff", async () => {
        try {
          return execFileSync("git", ["diff"], { encoding: "utf-8" });
        } catch {
          return "";
        }
      }),
  }),

  searchFiles: tool({
    description: "Search for text in files",
    inputSchema: z.object({
      query: z.string(),
      path: z.string().optional(),
    }),
    execute: async ({ query, path: p }) =>
      withSpinner("searchFiles", async () => {
        const dir = resolvePath(p);
        try {
          if (os.platform() === "win32") {
            // PowerShell Select-String (grep does not exist natively on Windows)
            const esc = (s: string) => `'${s.replace(/'/g, "''")}'`;
            return execFileSync(
              "powershell",
              [
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                `Get-ChildItem -Path ${esc(dir)} -Recurse -File -ErrorAction SilentlyContinue | Select-String -SimpleMatch -Pattern ${esc(query)} | Select-Object -First 100 | ForEach-Object { "$($_.Path):$($_.LineNumber): $($_.Line)" }`,
              ],
              {
                encoding: "utf-8",
                timeout: 30_000,
                maxBuffer: 10 * 1024 * 1024,
              },
            ).slice(0, 3000);
          }
          return execFileSync(
            "grep",
            ["-rn", "-I", "--", query, dir],
            {
              encoding: "utf-8",
              timeout: 30_000,
              maxBuffer: 10 * 1024 * 1024,
            },
          ).slice(0, 3000);
        } catch {
          return "";
        }
      }),
  }),

  webSearch: tool({
    description:
      "Search the web and return titles, URLs, snippets, and optionally full page text.",
    inputSchema: z.object({
      query: z.string(),
      maxResults: z.number().min(1).max(10).optional(),
      fetchContent: z.boolean().optional(),
      maxCharsPerPage: z.number().min(500).max(15000).optional(),
    }),
    execute: async ({
      query,
      fetchContent = false,
      maxCharsPerPage = 1500,
      maxResults = 3,
    }) => {
      const spinner = ora({
        text: `Searching: "${query}"`,
        color: "cyan",
        spinner: "dots2",
      }).start();

      let results: { title: string; url: string; snippet: string }[];
      try {
        results = await searchDuckDuckGo(query, maxResults);
        spinner.text = `Found ${results.length} results${fetchContent ? ", fetching pages..." : ""}`;
      } catch (err) {
        spinner.fail("Web search failed");
        return {
          error: `Search engine error: ${err instanceof Error ? err.message : String(err)}`,
        };
      }

      if (!fetchContent) {
        spinner.succeed(`Found ${results.length} results`);
        return { query, results };
      }

      const chunks: (typeof results)[] = [];
      for (let i = 0; i < results.length; i += 3)
        chunks.push(results.slice(i, i + 3));

      const enriched = [];
      let fetched = 0;
      for (const chunk of chunks) {
        const batch = await Promise.all(
          chunk.map(async (r) => {
            try {
              const page = await fetchAndParse(r.url, maxCharsPerPage);
              return { ...r, ...page };
            } catch (err) {
              return {
                ...r,
                error: err instanceof Error ? err.message : String(err),
              };
            }
          }),
        );
        fetched += batch.length;
        spinner.text = `Fetching pages... (${fetched}/${results.length})`;
        enriched.push(...batch);
      }

      spinner.succeed(`Fetched ${enriched.length}/${results.length} pages`);
      return { query, totalResults: enriched.length, results: enriched };
    },
  }),

  fetchWebPage: tool({
    description:
      "Fetch and parse a specific URL, returning clean readable text.",
    inputSchema: z.object({
      url: z.url(),
      maxChars: z.number().min(100).max(20000).optional(),
    }),
    execute: async ({ url, maxChars = 5000 }) =>
      withSpinner("fetchWebPage", async () => {
        try {
          return await fetchAndParse(url, maxChars);
        } catch (err) {
          return {
            url,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      }),
  }),

  returnCommands: tool({
    description:
      "Return the final shell commands to the user. ALWAYS call this tool with your final answer instead of writing the JSON array as plain text.",
    inputSchema: z.object({
      commands: z
        .array(z.string())
        .describe(
          "Exact shell commands in execution order. Empty array if the task is unsafe or impossible.",
        ),
    }),
    execute: async ({ commands }) => {
      capturedCommands = commands;
      return { status: "ok", count: commands.length };
    },
  }),
};
