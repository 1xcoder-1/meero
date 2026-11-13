/**
 * AI commit workflows — no "git" typing required:
 *
 *   meero recommit   → rewrite the messages of EXISTING commits with AI
 *   meero commit     → make a FRESH commit from staged changes with an
 *                      AI-written message (works on a repo with zero commits too)
 *
 * Both refuse to run outside a git repository. Diffs are redacted before
 * they reach the provider (env files, keys, tokens) — same policy as the
 * AI read tools.
 */
import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";
import { select, input, confirm } from "@inquirer/prompts";
import { getModel, getOllamaModel, ollamaAvailable } from "../ai/providers";
import { runLLM } from "../ai/run";
import { loadConfig } from "./config";
import { formatUsage, emptyUsage, type Usage } from "../ai/usage";

const EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";
const DIFF_LIMIT = 8000; // chars of diff sent to the provider per commit

function git(args: string[], opts: { allowFail?: boolean } = {}): string {
  try {
    return execFileSync("git", args, {
      encoding: "utf-8",
      maxBuffer: 32 * 1024 * 1024,
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (e) {
    if (opts.allowFail) return "";
    throw new Error(
      `git ${args[0]} failed: ${e instanceof Error ? e.message.split("\n")[0] : e}`,
    );
  }
}

function assertGitRepo(): void {
  try {
    git(["rev-parse", "--git-dir"]);
  } catch {
    console.error(
      chalk.red("Not a git repository — run this inside a project with .git."),
    );
    process.exit(1);
  }
}

function hasCommits(): boolean {
  return git(["rev-parse", "HEAD"], { allowFail: true }).trim().length > 0;
}

/** Secrets never leave the machine — redact before any provider call. */
export function redactSecrets(text: string): string {
  // Line-based pass: drop every hunk line of a sensitive file (until the next
  // "diff --git" header), keeping a marker so the AI knows why it's empty.
  const SENSITIVE =
    /\.(env(\.[a-z]+)?|pem|key|p12|pfx|pem)$|(^|\/)(id_rsa|id_ed25519|id_ecdsa)$|credentials[.\w]*$|secrets?\.\w+$/i;
  const out: string[] = [];
  let hiding: string | null = null;
  for (const line of text.split("\n")) {
    if (line.startsWith("diff --git ")) {
      if (hiding) out.push(`[${hiding} — CONTENT HIDDEN FOR SECURITY]`);
      const file = line.match(/ a\/(\S+) b\//)?.[1] ?? "";
      hiding = SENSITIVE.test(file) ? file : null;
    }
    if (hiding && !line.startsWith("diff --git ")) continue; // suppressed hunk
    out.push(line);
  }
  if (hiding) out.push(`[${hiding} — CONTENT HIDDEN FOR SECURITY]`);
  let t = out.join("\n");

  const patterns: [RegExp, string][] = [
    [/sk-[a-zA-Z0-9]{20,}|sk_[a-zA-Z0-9_-]{20,}/g, "[REDACTED_KEY]"],
    [/gh[pousr]_[a-zA-Z0-9]{30,}/g, "[REDACTED_GITHUB_TOKEN]"],
    [/xox[baprs]-[a-zA-Z0-9-]{10,}/g, "[REDACTED_SLACK_TOKEN]"],
    [/AKIA[0-9A-Z]{16}/g, "[REDACTED_AWS_KEY]"],
    [
      /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
      "[REDACTED_PRIVATE_KEY]",
    ],
    [/eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, "[REDACTED_JWT]"],
    [
      /(mongodb(\+srv)?|postgres(ql)?|mysql|redis):\/\/[^\s@]+@[^\s]+/gi,
      "$1://[REDACTED]",
    ],
    [/Bearer\s+[a-zA-Z0-9._-]{10,}/g, "Bearer [REDACTED]"],
    [
      /(password|passwd|api[_-]?key|secret|token)[\s]*[=:]\s*["']?([^"'\s]{8,})["']?/gi,
      "$1=[REDACTED]",
    ],
  ];
  for (const [re, rep] of patterns) t = t.replace(re, rep);
  return t;
}

/**
 * 0–10 message quality score (conventional-format aware). Commits that
 * already look good are skipped by `meero recommit` unless --all is set.
 */
export function assessCommitQuality(message: string): {
  score: number;
  isWellFormed: boolean;
  reason: string;
} {
  const first = (message.split("\n")[0] ?? "").trim();
  let score = 0;
  const reasons: string[] = [];
  if (/^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\([^)]+\))?: .+/.test(first)) {
    score += 4;
    reasons.push("conventional format");
  } else {
    reasons.push("not conventional format");
  }
  if (first.length >= 10 && first.length <= 72) {
    score += 2;
    reasons.push("good length");
  } else if (first.length < 10) reasons.push("too short");
  else reasons.push("too long");
  const generic = ["update", "fix", "change", "modify", "commit", "initial", "test", "wip", "stuff", "changes"];
  if (generic.some((g) => first.toLowerCase() === g || first.toLowerCase() === `${g}.`)) {
    reasons.push("too generic");
  } else {
    score += 2;
    reasons.push("descriptive");
  }
  if (/[a-z]/.test(first[0] ?? "")) score += 1;
  if (!first.endsWith(".")) score += 1;
  return { score, isWellFormed: score >= 7, reason: reasons.join(", ") };
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English", es: "Spanish", fr: "French", de: "German", it: "Italian",
  pt: "Portuguese", ru: "Russian", ja: "Japanese", ko: "Korean",
  zh: "Chinese", ar: "Arabic", hi: "Hindi", tr: "Turkish",
};

function buildMessagePrompt(
  diff: string,
  files: string[],
  oldMessage: string,
  opts: { template?: string; language?: string },
): string {
  const diffBlock = redactSecrets(diff).slice(0, DIFF_LIMIT);
  const lang = LANGUAGE_NAMES[(opts.language ?? "en").toLowerCase()] ?? "English";
  const template = opts.template?.trim();
  return `Analyze this change and write one ${lang} commit message.

${oldMessage ? `Old message: "${oldMessage}"\n` : ""}Files changed:
${files.join("\n")}

Diff (sensitive data redacted):
${diffBlock || "(no textual diff — e.g. mode/binary change)"}

Rules:
- ${template ? `Use EXACTLY this format: ${template}` : "Format: <type>(<scope>): <subject> — types: feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert, scope optional"}
- Present tense, lowercase, no trailing period, max 72 chars
- Describe WHAT changed and WHY, not HOW
Return ONLY the message text — no quotes, no explanation, nothing else.`;
}

const MSG_SYSTEM =
  "You generate clear, conventional git commit messages. You output only the message.";

/** One AI message generation call (tools disabled — plain text output). */
async function generateMessage(
  prompt: string,
): Promise<{ text: string; usage: Usage; modelUsed: string }> {
  const cfg = loadConfig();
  let model: any;
  let modelUsed: string;
  if (cfg.localEnabled && (await ollamaAvailable())) {
    model = getOllamaModel(cfg.localModel || "llama3.1");
    modelUsed = `ollama/${cfg.localModel || "llama3.1"}`;
  } else {
    model = getModel(cfg.provider, cfg.apiKey, cfg.model);
    modelUsed = cfg.model;
  }
  const res = await runLLM(model, prompt, undefined, MSG_SYSTEM, undefined, false);
  return { text: res.text ?? "", usage: res.usage, modelUsed };
}

export function sanitizeMessage(raw: string | null): string {
  if (!raw) return "";
  // take the first non-empty line, strip wrapping quotes/backticks/markdown
  const line = raw
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith("#"));
  return (line ?? "")
    .replace(/^["'`*]+|["'`*]+$/g, "")
    .replace(/^```.*$/, "")
    .trim()
    .slice(0, 120);
}

// ── meero recommit ────────────────────────────────────────────────────────────

export interface RecommitOpts {
  dryRun?: boolean;
  maxCommits?: number;
  all?: boolean; // rewrite even well-formed messages
  template?: string;
  language?: string;
}

export async function runRecommit(opts: RecommitOpts = {}): Promise<void> {
  assertGitRepo();
  if (!hasCommits()) {
    console.log(
      chalk.yellow(
        "No commits yet — nothing to re-commit. Use: meero commit (makes a fresh commit)",
      ),
    );
    return;
  }

  const head = git(["rev-parse", "--abbrev-ref", "HEAD"]).trim();
  const revArgs =
    opts.maxCommits && opts.maxCommits > 0
      ? ["rev-list", "-n", String(opts.maxCommits), "--reverse", "HEAD"]
      : ["rev-list", "--reverse", "HEAD"];
  const commits = git(revArgs).trim().split("\n").filter(Boolean);
  if (commits.length === 0) {
    console.log(chalk.yellow("No commits found."));
    return;
  }

  console.log(
    chalk.cyan.bold(`\n↺ meero recommit — ${commits.length} commit(s) on ${head}\n`),
  );

  const plan: { hash: string; old: string; fresh: string }[] = [];
  let skipped = 0;
  const totalUsage = emptyUsage();
  let modelUsed = "";

  for (let i = 0; i < commits.length; i++) {
    const hash = commits[i]!;
    const pct = `${Math.round(((i + 1) / commits.length) * 100)}%`;
    const oldMsg = git(["log", "-1", "--format=%s", hash]).trim();
    const files = git(["diff-tree", "--no-commit-id", "--name-only", "-r", hash])
      .trim()
      .split("\n")
      .filter(Boolean);

    const quality = assessCommitQuality(oldMsg);
    if (quality.isWellFormed && !opts.all) {
      skipped++;
      console.log(
        chalk.dim(`  ${pct} ✓ ${hash.slice(0, 8)} already good (${quality.score}/10) — "${oldMsg}"`),
      );
      continue;
    }

    let diff = "";
    const parent = git(["rev-parse", `${hash}^`], { allowFail: true }).trim();
    if (parent)
      diff = git(["diff-tree", "--no-commit-id", "-p", parent, hash], { allowFail: true });
    else
      diff = git(["diff-tree", "--no-commit-id", "-p", EMPTY_TREE, hash], { allowFail: true });

    console.log(
      chalk.blue(`  ${pct} ↻ ${hash.slice(0, 8)} "${oldMsg}" (${quality.reason})`),
    );
    const res = await generateMessage(buildMessagePrompt(diff, files, oldMsg, opts));
    totalUsage.inputTokens += res.usage.inputTokens;
    totalUsage.outputTokens += res.usage.outputTokens;
    totalUsage.toolCalls += res.usage.toolCalls;
    totalUsage.steps += res.usage.steps;
    modelUsed = res.modelUsed;
    const fresh = sanitizeMessage(res.text);
    if (!fresh || fresh === oldMsg) {
      console.log(chalk.dim(`        kept original`));
      continue;
    }
    plan.push({ hash, old: oldMsg, fresh });
    console.log(chalk.green(`        ✨ → "${fresh}"`));
    if (i < commits.length - 1) await new Promise((r) => setTimeout(r, 300));
  }

  console.log(chalk.dim(`\n  usage: ${formatUsage(totalUsage, modelUsed || "ai")}`));

  if (plan.length === 0) {
    console.log(
      chalk.green(
        `\n✨ All commits already well-formed — nothing to rewrite.${opts.all ? "" : " Use --all to force."}`,
      ),
    );
    return;
  }

  console.log(chalk.cyan(`\n📋 ${plan.length} message(s) to rewrite:`));
  for (const p of plan) {
    console.log(`  ${chalk.red(p.old)}  →  ${chalk.green(p.fresh)}`);
  }

  if (opts.dryRun) {
    console.log(chalk.yellow("\nDry run — nothing changed. Drop --dry-run to apply."));
    return;
  }

  let go: boolean;
  try {
    go = await confirm({
      message: "Apply these new messages (rewrites history)?",
      default: false,
    });
  } catch {
    return;
  }
  if (!go) {
    console.log(chalk.dim("Cancelled — history unchanged."));
    return;
  }

  const backup = `meero-backup-${head}-${Date.now()}`;
  git(["branch", backup]);

  // ordered messages for every commit (rewrite only where plan has an entry)
  const ordered: string[] = [];
  const map = new Map(plan.map((p) => [p.hash, p.fresh]));
  for (const c of commits) {
    ordered.push(map.get(c) ?? git(["log", "-1", "--format=%B", c]).trim());
  }
  const gitDir = git(["rev-parse", "--git-dir"]).trim();
  const mapFile = path.join(gitDir, "meero-msg-map.json");
  const counterFile = path.join(gitDir, "meero-msg-counter.txt");
  fs.writeFileSync(mapFile, JSON.stringify(ordered, null, 2));
  fs.writeFileSync(counterFile, "0");

  const filterScript = path.join(gitDir, "meero-filter-msg.cjs");
  const esc = (s: string) => s.replace(/\\/g, "\\\\");
  fs.writeFileSync(
    filterScript,
    `const fs = require('fs');
const messages = JSON.parse(fs.readFileSync('${esc(mapFile)}', 'utf8'));
const cf = '${esc(counterFile)}';
let n = parseInt(fs.readFileSync(cf, 'utf8'));
const next = messages[n] || '';
fs.writeFileSync(cf, String(n + 1));
let old = '';
process.stdin.on('data', (c) => { old += c; });
process.stdin.on('end', () => process.stdout.write(next || old.trim()));
`,
    { mode: 0o755 },
  );

  try {
    git([
      "filter-branch", "-f",
      "--msg-filter", `node "${filterScript.replace(/\\/g, "/")}"`,
      "HEAD",
    ]);
    console.log(chalk.green.bold(`\n✅ Rewrote ${plan.length} commit message(s).`));
    console.log(
      chalk.dim(
        `↺ Backup branch: ${backup} — restore with: git reset --hard ${backup}`,
      ),
    );
    console.log(
      chalk.dim(
        "Next: review (git log --oneline), then force-push if pushed before (--force-with-lease).",
      ),
    );
  } catch (e) {
    console.error(
      chalk.red(
        `Rewrite failed: ${e instanceof Error ? e.message : e}\nHistory unchanged — restore point: ${backup}`,
      ),
    );
    process.exitCode = 1;
  } finally {
    for (const f of [filterScript, mapFile, counterFile])
      try { fs.unlinkSync(f); } catch {}
  }
}

// ── meero commit (fresh commit) ──────────────────────────────────────────────

export interface FreshCommitOpts {
  message?: string; // skip AI, use this message
  language?: string;
  template?: string;
  all?: boolean; // stage everything automatically
}

export async function runFreshCommit(opts: FreshCommitOpts = {}): Promise<void> {
  assertGitRepo();

  let staged = git(["diff", "--cached", "--name-only"], { allowFail: true })
    .trim()
    .split("\n")
    .filter(Boolean);

  if (staged.length === 0) {
    const dirty = git(["status", "--porcelain"], { allowFail: true }).trim();
    if (!dirty) {
      console.log(chalk.yellow("Nothing to commit — no changes in this repository."));
      return;
    }
    let stageAll = opts.all === true;
    if (!stageAll) {
      try {
        stageAll = await confirm({
          message: "Nothing staged — stage all changes for this commit?",
          default: true,
        });
      } catch {
        return;
      }
    }
    if (!stageAll) {
      console.log(
        chalk.dim('Stage files first (meero "stage all changes"), then run: meero commit'),
      );
      return;
    }
    git(["add", "-A"]);
    staged = git(["diff", "--cached", "--name-only"]).trim().split("\n").filter(Boolean);
    if (staged.length === 0) {
      console.log(chalk.yellow("Nothing to commit."));
      return;
    }
  }

  const freshRepo = !hasCommits();
  const diff = git(["diff", "--cached"]);
  console.log(
    chalk.cyan.bold(
      `\n✚ meero commit — ${staged.length} file(s)${freshRepo ? " · first commit" : ""}\n`,
    ),
  );
  for (const f of staged) console.log(chalk.dim(`  · ${f}`));

  let message = opts.message?.trim() ?? "";
  if (!message) {
    const res = await generateMessage(buildMessagePrompt(diff, staged, "", opts));
    console.log(chalk.dim(`  ${formatUsage(res.usage, res.modelUsed)}`));
    message = sanitizeMessage(res.text);
    if (!message) {
      console.error(
        chalk.red('AI produced no message — try again or use: meero commit -m "<message>"'),
      );
      process.exit(1);
    }
  }

  console.log(chalk.green(`\n✨ ${message}`));
  if (opts.message) return commitNow(message); // explicit -m: no extra prompt

  let go: string;
  try {
    go = await select({
      message: "Commit with this message?",
      choices: [
        { name: "Yes", value: "yes" },
        { name: "Edit it", value: "edit" },
        { name: "No — cancel", value: "no" },
      ],
    });
  } catch {
    return;
  }
  if (go === "no") return console.log(chalk.dim("Cancelled — nothing committed."));
  if (go === "edit") {
    try {
      const edited = await input({ message: "Message:", default: message });
      message = edited.trim() || message;
    } catch {
      return;
    }
  }
  commitNow(message);
}

function commitNow(message: string): void {
  try {
    git(["commit", "-m", message]);
  } catch (e) {
    console.error(
      chalk.red(
        `Commit failed: ${e instanceof Error ? e.message : e}\nNothing was committed — your staged changes are intact.`,
      ),
    );
    process.exitCode = 1;
    return;
  }
  const hash = git(["rev-parse", "--short", "HEAD"]).trim();
  console.log(chalk.green(`✅ Committed ${hash} — "${message}"`));
}
