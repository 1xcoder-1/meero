/**
 * Zero-cost guardrail: meero is a developer tool, not a chatbot.
 * Casual one-liners ("hi", "how are you", "thanks") never reach the LLM —
 * they are caught here by rules BEFORE a single token is spent. Any text
 * with developer intent (tools, files, commands) always passes through.
 */

const DEV_HINT = new RegExp(
  "\\b(" +
    [
      // actions
      "install", "uninstall", "update", "upgrade", "remove", "delete",
      "create", "build", "run", "exec", "list", "show", "find", "search",
      "kill", "start", "stop", "restart", "reload", "deploy", "compile",
      "push", "pull", "clone", "commit", "merge", "rebase", "download",
      "upload", "copy", "move", "rename", "compress", "extract", "test",
      // dev tooling
      "git", "npm", "npx", "bun", "yarn", "pnpm", "deno", "docker",
      "compose", "curl", "wget", "ssh", "apt", "apt-get", "dnf", "pacman",
      "brew", "choco", "winget", "scoop", "pip", "cargo", "maven",
      "gradle", "dotnet", "make", "cmake", "grep", "awk", "sed",
      // shells & system
      "powershell", "pwsh", "bash", "zsh", "shell", "cmd", "command",
      "terminal", "port", "process", "file", "folder", "directory",
      "disk", "network", "dns", "server", "client", "env", "path",
      "package", "dependency", "repo", "repository", "database", "db",
      "sql", "mongo", "redis", "migration", "localhost", "url", "http",
      "https", "chmod", "chown", "tar", "zip", "unzip", "gzip", "sudo",
      // languages
      "node", "python", "rust", "golang", "java", "typescript",
      "javascript", "php", "ruby",
    ].join("|") +
    ")\\b",
  "i",
);

/** Greeting / small-talk / identity one-liners, matched from the start */
const CASUAL: RegExp[] = [
  /^(hi+|hey+|hello+|yo|hola|sup|salam|as-?salam[ou]?\s*al[ae]ikum|namaste|namaskar)\b/,
  /^good\s*(morning|afternoon|evening|night|day)\b/,
  /^(how\s*(are|r)\s*(you|u)|kaise\s*ho?|kya\s*haal|kaisa\s*hai|whats\s*up|what's\s*up|wassup)\b/,
  /^(thanks|thank\s*you|thx|ty|shukriya|jazakallah)\b/,
  /^(bye|goodbye|see\s*(ya|you)|alvida|khuda\s*hafiz)\b/,
  /^(who|what)\s*(are|r)\s*(you|u)\b/,
  /^(your|tumhara|aapka)\s*name\b|^what.s\s*your\s*name\b/,
  /^(ok(ay)?|nice|cool|great|awesome|wow|lol|hmm+|good)\s*[!. ]*$/,
];

/**
 * True when the text is casual chat with no developer intent:
 * short (≤6 words), no tool/file/command hints, and matches a
 * greeting / thanks / identity pattern.
 */
export function isCasualChat(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  if (t.split(/\s+/).length > 6) return false; // longer text = likely a real task
  if (DEV_HINT.test(t)) return false; // any developer intent wins
  return CASUAL.some((re) => re.test(t));
}

export const CASUAL_REPLY = [
  "meero is a developer tool — it runs shell commands, not chat.",
  'Try: meero "kill process on port 3000" · meero builtin · meero help',
].join("\n");
