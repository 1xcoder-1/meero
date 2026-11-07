#!/usr/bin/env bun

import { Command } from "commander";
import pkg from "./package.json" with { type: "json" };
import { setup, reset } from "./core/cli/setup";
import { generateStream } from "./core/ai/stream";
import { normalizeCommands, parseCommands } from "./core/input";
import { select, input, Separator } from "@inquirer/prompts";
import boxen from "boxen";
import { runCMDCapture } from "./core/cli/run";
import { detectShell, SANDBOX_SHELL } from "./core/cli/shell";
import { buildSystemPrompt } from "./core/ai/system-prompt";
import { safetyGate } from "./core/cli/safety";
import {
  buildFixPrompt,
  MAX_FIX_ROUNDS,
} from "./core/cli/repair";
import {
  appendHistory,
  clearHistory,
  readHistory,
  type HistoryResult,
} from "./core/cli/history";
import {
  createSnapshot,
  listSnapshots,
  undoSnapshot,
} from "./core/cli/snapshot";
import {
  confirmEach,
  confirmExecution,
  isTrustLevel,
  resolveTrust,
  setTrust,
  showTrust,
  type TrustLevel,
} from "./core/cli/trust";
import {
  deleteRecipe,
  exportRecipesToFile,
  getRecipe,
  importRecipesFromFile,
  listRecipes,
  saveRecipe,
} from "./core/cli/recipes";
import {
  getBuiltin,
  getBuiltinInput,
  isBuiltinRisky,
  listBuiltins,
  resolveBuiltin,
  type BuiltinCmd,
} from "./core/cli/builtin";
import {
  CASUAL_REPLY,
  isCasualChat,
  stripMeeroPrefix,
} from "./core/cli/guardrail";
import { copyToClipboard } from "./core/cli/clipboard";
import {
  DEFAULT_SANDBOX_IMAGE,
  dockerAvailable,
  runSandboxed,
} from "./core/cli/sandbox";
import { ollamaAvailable } from "./core/ai/providers";
import { changeModel, loadConfig, overwriteConfig } from "./core/cli/config";
import { fetchModels } from "./core/ai/models";
import { isMetaRequest } from "./core/cli/meta";
import { formatUsage } from "./core/ai/usage";
import chalk from "chalk";
import readline from "readline";

const program = new Command();

interface RunOpts {
  print?: boolean;
  dryRun?: boolean;
  copy?: boolean;
  trust?: string;
  sandbox?: string | boolean;
  local?: boolean;
}

/** Snapshot before execution so `meero undo` can revert; never blocks the run */
async function snapshotFor(commands: string[]): Promise<string | null> {
  try {
    const snapId = await createSnapshot(commands);
    if (snapId)
      console.log(
        chalk.dim(`\n↺ Snapshot ${snapId} — revert: meero undo`),
      );
    return snapId;
  } catch (e) {
    console.log(
      chalk.yellow(
        `⚠ Snapshot failed (${e instanceof Error ? e.message : e}); meero undo will not cover this run`,
      ),
    );
    return null;
  }
}

function sandboxImageOf(opts: RunOpts): string | null {
  if (!opts.sandbox) return null;
  return typeof opts.sandbox === "string" ? opts.sandbox : DEFAULT_SANDBOX_IMAGE;
}

/**
 * Execute a task's commands with the error-recovery loop: on failure the
 * real output is fed back to the AI, which returns corrected remaining
 * commands (bounded repair rounds). Every task lands in meero history.
 */
async function runTask(
  task: string,
  commands: string[],
  ctx: { level: TrustLevel; sandboxImage: string | null; offerRecipe?: boolean },
): Promise<boolean> {
  await safetyGate(commands);
  const snapshotId = await snapshotFor(commands);

  let queue = [...commands];
  const succeeded: string[] = [];
  const results: HistoryResult[] = [];
  let round = 0;
  let aborted = false;

  while (queue.length > 0) {
    const cmd = queue.shift()!;

    if (ctx.level === "low") {
      const go = await confirmEach(cmd);
      if (go === "abort") {
        aborted = true;
        break;
      }
      if (go === false) {
        results.push({ cmd, exitCode: 0 }); // deliberately skipped
        continue;
      }
    }

    console.log(`\n→ ${cmd}`);
    const r = ctx.sandboxImage
      ? await runSandboxed(cmd, ctx.sandboxImage)
      : await runCMDCapture(cmd);
    results.push({ cmd, exitCode: r.exitCode });
    if (r.exitCode === 0) {
      succeeded.push(cmd);
      continue;
    }

    console.log(chalk.red(`✖ Command failed (exit code ${r.exitCode})`));

    // Offer AI repair until a fix set is produced or the user declines
    let fixed: string[] | null = null;
    while (round < MAX_FIX_ROUNDS) {
      let go: string;
      try {
        go = await select({
          message: "Let the AI repair this failure?",
          choices: [
            {
              name: `Yes — AI fix (attempt ${round + 1}/${MAX_FIX_ROUNDS})`,
              value: "fix",
            },
            { name: "No — stop here", value: "stop" },
          ],
        });
      } catch {
        go = "stop"; // Ctrl+C at the prompt = stop
      }
      if (go !== "fix") break;

      round++;
      const res = await generateStream(
        buildFixPrompt({
          task,
          failedCmd: cmd,
          exitCode: r.exitCode,
          output: r.output,
          succeeded,
          remaining: queue.length,
          round,
        }),
        // repair runs in the same execution context as the original task
        ctx.sandboxImage ? { systemPrompt: buildSystemPrompt(SANDBOX_SHELL) } : {},
      );
      const candidate = normalizeCommands(parseCommands(res.text ?? ""));
      if (candidate.length === 0) {
        console.log(chalk.yellow("AI produced no fix for this failure."));
        continue;
      }
      fixed = candidate;
      break;
    }

    if (!fixed) {
      aborted = true; // user stopped or rounds exhausted
      break;
    }

    console.log(chalk.magenta(`AI fix — round ${round}:`));
    console.log(fixed.map((c) => chalk.magenta(`  ${c}`)).join("\n"));
    await safetyGate(fixed);
    await snapshotFor(fixed);
    // The fix replaces everything still pending for this task
    queue = [...fixed];
  }

  const completed = !aborted;
  appendHistory({
    ts: Date.now(),
    task,
    ok: completed,
    rounds: round,
    results,
    snapshotId,
  });

  if (!completed) {
    console.log(
      chalk.dim(
        "Task stopped with failures. See `meero history`; revert file changes with `meero undo`.",
      ),
    );
  } else if (
    ctx.offerRecipe !== false &&
    commands.length > 1 &&
    !ctx.sandboxImage
  ) {
    // proven sequence — offer to remember it (never for pre-built packs:
    // they are already first-class and the prompt just stalls scripts)
    try {
      const save = await select({
        message: "Task done. Save this as a recipe for `meero run <name>`?",
        choices: [
          { name: "Yes, save it", value: 1 },
          { name: "No", value: 0 },
        ],
      });
      if (save === 1) {
        const guess = task
          .toLowerCase()
          .replace(/[^a-z0-9 ]/g, "")
          .trim()
          .split(/\s+/)
          .slice(0, 3)
          .join("-");
        let name = await input({
          message: "Recipe name:",
          default: guess || "recipe",
        });
        name = name.trim() || guess || "recipe";
        saveRecipe(name, task, commands);
        console.log(
          chalk.green(`Recipe ${name} saved — run it later: meero run ${name}`),
        );
      }
    } catch {
      // Ctrl+C here is not an error — the task already succeeded
    }
  }
  return completed;
}

/** Full pipeline for one natural-language task (CLI one-shot) */
async function handleTask(text: string, opts: RunOpts): Promise<void> {
  const sandboxImage = sandboxImageOf(opts);

  // chat replies stream to the terminal as they generate; JSON/fenced
  // command payloads are held back — they render as the numbered list below
  let acc = "";
  let hold = false;
  let streamedAny = false;
  const onText = (delta: string) => {
    acc += delta;
    if (hold) return;
    if (/^\s*(\{|\[|```)/.test(acc)) {
      hold = true;
      return;
    }
    streamedAny = true;
    process.stdout.write(delta);
  };

  const gen = await generateStream(text, {
    preferLocal: opts.local,
    onText,
    // inside docker the executor is POSIX sh, whatever the host is
    ...(sandboxImage ? { systemPrompt: buildSystemPrompt(SANDBOX_SHELL) } : {}),
  });
  if (streamedAny) process.stdout.write("\n");

  const parsed = parseCommands(gen.text ?? "");
  const normalized = normalizeCommands(parsed);

  const content = normalized.join("\n");
  if (!content) {
    // a chat reply already streamed live — only print it if nothing streamed
    if (gen.text && gen.text.trim()) {
      if (!streamedAny) console.log(gen.text.trim());
      console.log(chalk.dim(`  ${formatUsage(gen.usage, gen.modelUsed)}`));
    } else {
      console.log(chalk.red("No commands generated — try being more specific."));
    }
    return;
  }

  console.log(normalized.map((c, i) => chalk.cyan(`${i + 1}. ${c}`)).join("\n"));
  // cost line — tokens + approximate $, printed with every task
  console.log(chalk.dim(`  ${formatUsage(gen.usage, gen.modelUsed)}`));

  if (opts.print || opts.dryRun) return; // Tier-2: just show the command

  if (opts.copy) {
    console.log(
      copyToClipboard(content)
        ? chalk.green("Copied to clipboard — nothing was executed.")
        : chalk.yellow("Clipboard unavailable on this system."),
    );
    return;
  }

  if (sandboxImage && !dockerAvailable()) {
    console.error(
      chalk.red(
        `--sandbox needs a working docker daemon (tried image "${sandboxImage}"). Start Docker or drop the flag.`,
      ),
    );
    return;
  }

  const level = resolveTrust(opts.trust);
  let commands = normalized;

  if (level !== "high") {
    let ok: number;
    try {
      ok = await select({
        message: "Execute these commands?",
        choices: [
          { name: "Yes", value: 1 },
          { name: "No", value: 0 },
          { name: "Modify", value: 2 },
        ],
      });
    } catch {
      return; // Ctrl+C = don't run (no scary SIGINT error)
    }
    if (ok !== 1 && ok !== 2) return;
    if (ok === 2) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true,
      });
      // `&&` is invalid in Windows PowerShell 5.1 — use its separator there
      const sep =
        !sandboxImage && detectShell().id === "powershell" ? " ; " : " && ";
      const edited = await new Promise<string>((resolve) => {
        rl.question("", (answer) => {
          resolve(answer);
          rl.close();
        });
        rl.write(content.replace(/\n/g, sep));
      });
      commands = edited.split(sep).filter(Boolean);
      if (commands.length === 0) return;
    }
  }

  await runTask(text, commands, { level, sandboxImage });
}

/**
 * Pre-built command packs: ZERO AI for generation or execution. The
 * variant matching the detected shell is resolved automatically, and the
 * smart auto-run decides the gate: safe packs start immediately, risky
 * ones (kill / prune / deletes) get one confirmation. If a command still
 * fails, runTask's existing AI repair loop offers a fix.
 */
async function runBuiltinPage(id?: string, args: string[] = []): Promise<void> {
  let cmd: BuiltinCmd | undefined;
  if (id) {
    cmd = getBuiltin(id) ?? undefined;
    if (!cmd) {
      console.error(
        chalk.red(
          `No built-in named "${id}" — run ${chalk.cyan("meero builtin")} for the interactive menu.`,
        ),
      );
      process.exit(1);
    }
  } else {
    const all = listBuiltins();
    const choices: (Separator | { name: string; value: string; description: string })[] = [];
    for (const group of [...new Set(all.map((c) => c.group))]) {
      choices.push(new Separator(chalk.dim(`  ${group} `)));
      for (const c of all.filter((x) => x.group === group))
        choices.push({ name: `${c.label}`, value: c.id, description: c.desc });
    }
    let picked: string;
    try {
      picked = await select({
        message: `Pre-built commands — ${detectShell().label}, no AI needed`,
        choices,
      });
    } catch {
      return; // Ctrl+C
    }
    cmd = getBuiltin(picked) ?? undefined;
  }
  if (!cmd) return;

  // positional CLI args fill params in order; missing ones are prompted
  const values: Record<string, string> = {};
  const params = cmd.params ?? [];
  for (let i = 0; i < params.length; i++) {
    const p = params[i];
    if (!p) continue;
    const arg = args[i];
    if (arg) values[p.token] = arg;
    else {
      try {
        values[p.token] = await input({
          message: p.message,
          default: p.default,
        });
      } catch {
        return; // Ctrl+C
      }
    }
  }

  const shell = detectShell();
  const { commands, key } = resolveBuiltin(cmd, shell, values);
  if (commands.length === 0) {
    console.error(chalk.red(`No variant of "${cmd.id}" matches ${shell.label}.`));
    process.exit(1);
  }

  console.log(chalk.blue(`builtin: ${cmd.label}`));
  console.log(chalk.dim(`  shell: ${shell.label} · variant: ${key}`));
  console.log(commands.map((c, i) => chalk.cyan(`${i + 1}. ${c}`)).join("\n"));

  const opts = program.opts<RunOpts>();
  const level = resolveTrust(opts.trust);
  const risky = isBuiltinRisky(commands, cmd);
  // smart auto-run: safe → straight to execution; risky → one confirm
  if (risky && !(await confirmExecution(commands, level))) {
    console.log(chalk.dim("Cancelled — nothing was executed."));
    return;
  }
  await runTask(`builtin:${cmd.id}`, commands, {
    level,
    sandboxImage: sandboxImageOf(opts),
    offerRecipe: false,
  });
}

function doUndo(id?: string): void {
  const result = undoSnapshot(id);
  if (!result) {
    console.log(
      id
        ? `No snapshot found with id ${id}. See: meero undo --list`
        : "Nothing to undo — no snapshots exist.",
    );
    return;
  }
  console.log(
    chalk.green(`↺ Reverted snapshot ${chalk.bold(result.id)}`) +
      chalk.dim(
        ` — restored: ${result.restored} · removed: ${result.removed} · skipped: ${result.skipped}`,
      ),
  );
}

/** /model [name] — switch the active model; the current one is marked */
async function runModelPage(arg?: string): Promise<void> {
  const cfg = loadConfig();
  if (arg) {
    cfg.model = arg;
    overwriteConfig(cfg);
    console.log(chalk.green(`Model set to ${arg} — applies immediately.`));
    return;
  }
  let models: string[];
  try {
    models = await fetchModels(cfg.provider, cfg.apiKey);
  } catch (e) {
    console.log(
      chalk.red(
        `Could not list models for ${cfg.provider}: ${e instanceof Error ? e.message : e}`,
      ),
    );
    return;
  }
  if (models.length === 0) {
    console.log(chalk.yellow("Provider returned no models."));
    return;
  }
  let picked: string;
  try {
    picked = await select({
      message: `Model (provider: ${cfg.provider})`,
      choices: models.map((m) => ({
        name: m === cfg.model ? `${m}  ✓ current` : m,
        value: m,
      })),
      default: models.includes(cfg.model) ? cfg.model : undefined,
    });
  } catch {
    return; // Ctrl+C
  }
  if (picked === cfg.model) {
    console.log(chalk.dim(`${picked} is already active.`));
    return;
  }
  cfg.model = picked;
  overwriteConfig(cfg);
  console.log(chalk.green(`Model changed to ${picked} — applies immediately.`));
}

/** /settings — live view of the config with inline changes */
async function runSettingsPage(): Promise<void> {
  for (;;) {
    const cfg = loadConfig();
    const up = await ollamaAvailable();
    console.log(
      [
        "",
        `  provider    ${chalk.cyan(cfg.provider)}`,
        `  model       ${chalk.cyan(cfg.model)}`,
        `  cheap mode  ${cfg.localEnabled ? chalk.green("ON") : chalk.dim("off")} · local model: ${chalk.cyan(cfg.localModel ?? "llama3.1")} · ollama: ${up ? chalk.green("reachable") : chalk.red("not running")}`,
        `  config      ${chalk.dim("~/.meero/config.json")}`,
        "",
      ].join("\n"),
    );
    let action: string;
    try {
      action = await select({
        message: "Settings",
        choices: [
          { name: "Change model", value: "model" },
          { name: "Re-run setup (provider + API key)", value: "setup" },
          {
            name: `Cheap mode (Ollama): turn ${cfg.localEnabled ? "off" : "on"}`,
            value: "local",
          },
          { name: "Back", value: "back" },
        ],
      });
    } catch {
      return; // Ctrl+C
    }
    if (action === "back") return;
    if (action === "model") await runModelPage();
    if (action === "setup") await setup();
    if (action === "local") {
      cfg.localEnabled = !cfg.localEnabled;
      overwriteConfig(cfg);
      console.log(
        chalk.green(`Cheap mode ${cfg.localEnabled ? "enabled" : "disabled"}.`),
      );
    }
  }
}

program
  .name("meero")
  .description("Natural language → shell commands, run right in this terminal")
  .version(pkg.version, "-v, --version", "output the version number")
  .argument("[input...]")
  .option("--print", "generate and show commands; never execute")
  .option("--dry-run", "alias of --print")
  .option("--copy", "generate and copy commands to clipboard; never execute")
  .option("--trust <level>", "this run only: low | med | high")
  .option("--sandbox [image]", "run commands in a throwaway docker container")
  .option("--local", "prefer a local Ollama model for this task");

program.command("setup").action(async () => {
  await setup();
});

program.command("model").action(async () => {
  await changeModel();
});

program
  .command("settings")
  .description("View + change model, provider, cheap mode")
  .action(async () => {
    await runSettingsPage();
  });

program.command("reset").action(async () => {
  reset();
});

program
  .command("undo")
  .description("Revert files changed by the last meero task")
  .argument("[id]", "snapshot id (default: most recent)")
  .option("--list", "list available snapshots")
  .action((id: string | undefined, opts: { list?: boolean }) => {
    if (opts.list) {
      const snaps = listSnapshots();
      if (snaps.length === 0) return console.log("No snapshots yet.");
      for (const s of snaps) {
        console.log(
          `${chalk.cyan(s.id)}  ${new Date(s.ts).toLocaleString()}  ${chalk.dim(
            `${s.entries.length} file(s)  ${s.commands[0] ?? ""}`,
          )}`,
        );
      }
      return;
    }
    doUndo(id);
  });

program
  .command("history")
  .description("Show recent meero tasks and their outcomes")
  .option("--clear", "erase task history")
  .action((opts: { clear?: boolean }) => {
    if (opts.clear) {
      console.log(clearHistory() ? "History cleared." : "No history file.");
      return;
    }
    const entries = readHistory(15);
    if (entries.length === 0) {
      console.log("No history yet — run meero first.");
      return;
    }
    for (const e of entries) {
      const mark = e.ok ? chalk.green("✔") : chalk.red("✖");
      const fixNote =
        e.rounds > 0 ? chalk.dim(`  [${e.rounds} AI fix round(s)]`) : "";
      console.log(
        `${mark} ${chalk.dim(new Date(e.ts).toLocaleString())}  ${e.task.slice(0, 70)}${fixNote}`,
      );
      console.log(
        chalk.dim(
          `   ${e.results.map((r) => r.cmd).join(" ; ").slice(0, 110)}`,
        ),
      );
    }
  });

program
  .command("trust")
  .description("Set confirmation strictness: low | med | high")
  .argument("[level]", "low | med | high (omit to show current)")
  .option("--here", "apply to the current directory only")
  .action((level: string | undefined, opts: { here?: boolean }) => {
    if (!level) {
      const t = showTrust();
      console.log(
        `trust = ${chalk.bold(t.effective)} (${t.scope} default) — change with: meero trust low|med|high${opts.here ? " --here" : ""}`,
      );
      return;
    }
    if (!isTrustLevel(level)) {
      console.error(chalk.red(`Invalid trust level "${level}" — use low, med or high`));
      process.exit(1);
    }
    setTrust(level, opts.here ? process.cwd() : undefined);
    console.log(
      `Trust set to ${chalk.bold(level)} ${opts.here ? `for ${process.cwd()}` : "globally"}.`,
    );
  });

program
  .command("local")
  .description("Local-first cheap mode (Ollama) — on | off | status")
  .argument("[state]", "on | off | status", "status")
  .action(async (state: string) => {
    if (state !== "on" && state !== "off" && state !== "status") {
      console.error(chalk.red("Usage: meero local on|off|status"));
      process.exit(1);
    }
    const cfg = loadConfig();
    if (state === "status") {
      const enabled = cfg.localEnabled ?? false;
      const up = await ollamaAvailable();
      console.log(
        `cheap mode: ${enabled ? chalk.green("ON") : chalk.dim("off")} · model: ${cfg.localModel ?? "llama3.1"} · ollama: ${up ? chalk.green("reachable") : chalk.red("not running (port 11434)")}`,
      );
      return;
    }
    cfg.localEnabled = state === "on";
    overwriteConfig(cfg);
    console.log(`Local-first cheap mode ${state === "on" ? "enabled" : "disabled"}.`);
  });

program
  .command("recipe")
  .description("Saved command playbooks")
  .argument("<action>", "list | rm <name> | export [file] [names...] | import <file>")
  .argument("[args...]", "action arguments")
  .option("--force", "overwrite same-named recipes on import")
  .action((action: string, args: string[], opts: { force?: boolean }) => {
    if (action === "list" || !action) {
      const rs = listRecipes();
      if (rs.length === 0) return console.log("No recipes yet.");
      for (const r of rs) {
        console.log(
          `${chalk.cyan(r.name)}  ${chalk.dim(new Date(r.createdAt).toLocaleDateString())}  ${r.commands.length} cmd(s)  ${chalk.dim(r.task.slice(0, 50))}`,
        );
      }
      return;
    }
    if (action === "rm") {
      const name = args[0];
      if (!name) return console.error(chalk.red("Usage: meero recipe rm <name>"));
      console.log(
        deleteRecipe(name)
          ? `Recipe ${name} deleted.`
          : `No recipe named "${name}". See: meero recipe list`,
      );
      return;
    }
    if (action === "export") {
      const file = args[0] ?? "meero-recipes.json";
      const names = args.slice(1);
      const { count, missing } = exportRecipesToFile(file, names.length ? names : null);
      if (count === 0)
        return console.error(chalk.red("Nothing to export — no matching recipes."));
      if (missing.length > 0)
        console.log(chalk.yellow(`Not found (skipped): ${missing.join(", ")}`));
      console.log(
        chalk.green(`Exported ${count} recipe(s) to ${file} — share the file, then: meero recipe import ${file}`),
      );
      return;
    }
    if (action === "import") {
      const file = args[0];
      if (!file) return console.error(chalk.red("Usage: meero recipe import <file> [--force]"));
      let res;
      try {
        res = importRecipesFromFile(file, opts.force);
      } catch (e) {
        return console.error(
          chalk.red(`Could not import "${file}": ${(e as Error).message}`),
        );
      }
      const parts = [`${res.imported.length} imported`];
      if (res.skipped.length)
        parts.push(`${res.skipped.length} skipped (already exist — use --force to overwrite): ${res.skipped.join(", ")}`);
      if (res.invalid)
        parts.push(`${res.invalid} invalid entries ignored`);
      console.log(chalk.green(`Imported ${file}: ${parts.join(" · ")}.`));
      return;
    }
    console.error(
      chalk.red(
        `Unknown recipe action "${action}" — use list, rm, export or import`,
      ),
    );
  });

program
  .command("recipes")
  .description("Alias for: meero recipe list")
  .action(() => {
    const rs = listRecipes();
    if (rs.length === 0) return console.log("No recipes yet.");
    for (const r of rs) {
      console.log(
        `${chalk.cyan(r.name)}  ${chalk.dim(new Date(r.createdAt).toLocaleDateString())}  ${r.commands.length} cmd(s)  ${chalk.dim(r.task.slice(0, 50))}`,
      );
    }
  });

program
  .command("run <name>")
  .description("Run a saved recipe (no LLM involved)")
  .action(async (name: string) => {
    const recipe = getRecipe(name);
    if (!recipe) {
      console.error(
        `No recipe named "${name}". See: meero recipe list`,
      );
      process.exit(1);
    }
    console.log(chalk.blue(`recipe: ${recipe.name}`));
    console.log(recipe.commands.map((c, i) => `${i + 1}. ${c}`).join("\n"));
    const opts = program.opts<RunOpts>();
    const level = resolveTrust(opts.trust);
    if (!(await confirmExecution(recipe.commands, level))) return;
    await runTask(`recipe:${name}`, recipe.commands, {
      level,
      sandboxImage: sandboxImageOf(opts),
    });
  });

program
  .command("builtin [id] [args...]")
  .description(
    "Run a pre-built command pack — no AI, auto shell detect (menu when no id)",
  )
  .action(async (id: string | undefined, args: string[]) => {
    await runBuiltinPage(id, args ?? []);
  });

program
  .command("builtins")
  .description("Alias of: meero builtin (interactive menu)")
  .action(async () => {
    await runBuiltinPage();
  });

function printHelp(): void {
  console.log(
    boxen(
      `
  ✨ meero — AI-powered CLI assistant

  USAGE
    ${chalk.cyan("meero")} "your task"        Generate and run shell commands (AI)
    ${chalk.cyan("meero")}                    this help — meero has no chat mode
    ${chalk.cyan("meero")} <command>          Run a specific command

  FLAGS
    --print / --dry-run      Generate only; show, never execute
    --copy                   Generate and copy to clipboard
    --trust low|med|high     Confirm strictness for this run
    --local                  Prefer local Ollama model (cheap mode)
    --sandbox [image]        Run in a throwaway docker container (experimental)

  COMMANDS
    setup                  Configure your API key and model
    model                  Switch the active model
    settings               Model, provider and cheap mode in one page
    undo                   Revert files changed by the last task
    undo --list            List undo snapshots
    history                Recent tasks and their outcomes
    history --clear        Erase task history
    trust [level] [--here] Confirmation strictness (per dir supported)
    local on|off|status    Ollama cheap mode routing
    recipe list / recipe rm <name>
    recipes                Alias of: recipe list
    run <name>             Execute a saved recipe
    builtin [id] [args]    Pre-built pack menu — no AI, auto shell detect
    builtins               Alias of: builtin (interactive menu)
    <pack>                 60 packs run directly, no AI: meero status,
                           meero kill-port 8080, meero doctor, meero ps
    reset                  Reset config to defaults
    help                   Show this help message

  ALWAYS ON
    safety gate · blast-radius preview · web cross-check
    self-repair · undo snapshots · cost line · shell auto-detect
    pre-built packs (no AI) · chat guardrail
  
  EXAMPLES
    ${chalk.cyan("meero")} list all running docker containers
    ${chalk.cyan("meero")} find large files over 100mb
    ${chalk.cyan("meero")} --copy kill process on port 3000
    ${chalk.cyan("meero")} --trust high compress all pngs in current folder
    ${chalk.cyan("meero builtin")}                    interactive menu (no AI)
    ${chalk.cyan("meero status")}                     run git-status instantly (no AI)
    ${chalk.cyan("meero kill-port 8080")}             run one pack directly
    ${chalk.cyan("meero whoport 3000")}               who is hogging the port (no AI)
`,
      {
        padding: 0.1,
        borderStyle: "round",
        borderColor: "green",
        title: "help",
        titleAlignment: "left",
      },
    ),
  );
}

program.action(async (input: string[]) => {
  const opts = program.opts<RunOpts>();

  // a typed/quoted "meero" prefix is noise ("meero hi") — strip it so the
  // chat guardrail sees the real words; nothing left means help, not chat
  const text = stripMeeroPrefix((input ?? []).join(" ").trim());
  if (!text) {
    printHelp(); // no task given — and there is no chat mode to fall into
    return;
  }

  // direct pack: "meero status 3000" runs a built-in — zero AI, zero cost
  const parts = text.split(/\s+/);
  const direct = getBuiltinInput(parts[0] ?? "");
  if (direct) {
    await runBuiltinPage(direct.id, parts.slice(1));
    return;
  }

  if (isMetaRequest(text)) {
    console.log(
      "That looks like a meero config request — run: meero setup · meero model",
    );
    return;
  }

  // developer-tool guardrail: casual chat never reaches the LLM
  if (isCasualChat(text)) {
    console.log(chalk.yellow(CASUAL_REPLY));
    return;
  }

  await handleTask(text, opts);
});

program.parse();
