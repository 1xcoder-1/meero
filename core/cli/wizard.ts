import { input } from "@inquirer/prompts";
import boxen from "boxen";
import chalk from "chalk";
import type { ModelMessage } from "ai";
import { isMetaRequest } from "./meta";
import { CASUAL_REPLY, isCasualChat } from "./guardrail";

export interface WizardDeps {
  /** runs one natural-language task through the full generate→confirm→execute pipeline */
  handleTask: (text: string, session: ModelMessage[]) => Promise<void>;
  /** /undo — reverts the last snapshot, printing the same summary as `meero undo` */
  runUndo: () => void;
  /** /trust <level> — changes trust for this session only */
  setSessionTrust?: (level: string) => void;
  /** /settings — interactive settings page (model, provider, cheap mode) */
  runSettings?: () => Promise<void>;
  /** /model [name] — switch the active AI model */
  runModel?: (arg?: string) => Promise<void>;
  /** /builtin — pre-built command packs, zero AI */
  runBuiltins?: () => Promise<void>;
}

const WELCOME = `
  ✨ meero wizard — keep typing tasks; context carries between them.

    just text        generate + run a task
    ${chalk.cyan("/builtin")}       pre-built commands — instant, no AI
    ${chalk.cyan("/settings")}      view + change model, provider, cheap mode
    ${chalk.cyan("/model [name]")}  switch the AI model
    ${chalk.cyan("/undo")}          revert the last task's file changes
    ${chalk.cyan("/trust low|med|high")}  change confirm strictness (this session)
    ${chalk.cyan("/commands")}      full command reference
    ${chalk.cyan("/help")}          this cheat sheet
    ${chalk.cyan("/exit")}          leave (Ctrl+C works too)
`;

const COMMANDS = `
  TASKS
    <text>                generate + run a task
    /builtin              pre-built command packs (no AI, auto shell detect)
    meero help            this reference outside the wizard

  BUILT-INS (34 packs, zero AI — safe auto-runs, risky asks once)
    packages    update-system, update-choco, npm-cache-clean, reinstall-node-modules, deps-install
    network     public-ip, check-url [url], open-ports, network-info, dns-flush,
                active-connections, speed-test, show-hosts
    processes   kill-port [port], top-processes, kill-node
    disk        disk-usage, large-files, clean-build, empty-trash
    git         git-status, git-pull, git-undo-commit, git-sync, git-branches,
                git-log-graph, git-stash
    dev         docker-clean, docker-ps, docker-logs [container], env-info, npm-audit-fix
    system      system-info, memory-usage

  WIZARD
    /settings             view + change model, provider, cheap mode
    /model [name]         switch the AI model (fetches the provider's list)
    /undo                 revert the last task's file changes
    /trust low|med|high   confirmation strictness (this session)
    /commands             this reference
    /help                 quick cheat sheet
    /exit                 leave

  CLI
    meero setup                     configure provider + API key + model
    meero model                     switch the active model
    meero undo [id|--list]          restore files changed by the last task
    meero history [--clear]         past tasks + outcomes
    meero trust [level] [--here]    strictness per directory (low|med|high)
    meero local on|off|status       Ollama cheap mode
    meero recipe list|rm|export|import
    meero recipes                   alias of: meero recipe list
    meero run <name>                replay a saved recipe (no LLM)
    meero builtin [id] [args]       pre-built dev commands — no AI
    meero builtins                  alias of: meero builtin (menu)
    meero reset                     remove the config

  FLAGS (one-shot)
    --print | --dry-run   show commands, never execute
    --copy                copy commands to clipboard
    --trust <level>       strictness for this run only
    --local               prefer the local Ollama model for this task
    --sandbox [image]     run inside a throwaway docker container

  ALWAYS ON (no command needed)
    safety gate           dangerous commands stop at a red box — type "confirm"
    blast-radius preview  shows which files change + sizes before running
    web cross-check       the gate pulls real docs for risky commands
    self-repair           a failed command's output goes back to the AI (3 rounds)
    snapshots + undo      every mutating task is revertible via meero undo
    cost line             tokens + approximate $ printed after each task
    shell auto-detect     PowerShell 7 / 5.1 / cmd / bash / zsh / sh
`;

export async function startWizard(deps: WizardDeps): Promise<void> {
  console.log(
    boxen(WELCOME, {
      padding: 1,
      borderStyle: "round",
      borderColor: "green",
      title: "wizard",
      titleAlignment: "left",
    }),
  );

  // The one thing a REPL buys over one-shot runs: growing conversation context
  const session: ModelMessage[] = [];

  for (;;) {
    let line: string;
    try {
      line = await input({ message: chalk.green("meero ▸") });
    } catch {
      break; // Ctrl+C / Ctrl+D
    }
    const text = line.trim();
    if (!text) continue;

    if (/^(\/?exit|\/?quit)$/.test(text)) break;

    if (text === "/help") {
      console.log(WELCOME);
      continue;
    }
    if (text === "/commands") {
      console.log(COMMANDS);
      continue;
    }
    if (text === "/settings") {
      await deps.runSettings?.();
      continue;
    }
    if (text.startsWith("/model")) {
      const arg = text.split(/\s+/)[1];
      if (arg?.startsWith("/")) {
        console.log(chalk.yellow("Usage: /model  or  /model <model-name>"));
        continue;
      }
      await deps.runModel?.(arg);
      continue;
    }
    if (text === "/undo") {
      deps.runUndo();
      continue;
    }
    if (text === "/builtin" || text === "/builtins") {
      await deps.runBuiltins?.();
      continue;
    }
    if (text.startsWith("/trust")) {
      const level = text.split(/\s+/)[1];
      if (!level || !["low", "med", "high"].includes(level)) {
        console.log(chalk.yellow("Usage: /trust low|med|high"));
        continue;
      }
      deps.setSessionTrust?.(level);
      console.log(chalk.dim(`trust = ${level} for this session`));
      continue;
    }
    if (text.startsWith("/")) {
      console.log(chalk.yellow(`Unknown command ${text} — see /help`));
      continue;
    }

    // developer-tool guardrail: casual chat never reaches the LLM
    if (isCasualChat(text)) {
      console.log(chalk.yellow(CASUAL_REPLY));
      continue;
    }

    // requests about meero itself never reach the LLM — it once "solved" a
    // typo'd `meero steup` by installing a random third-party CLI from the web
    if (isMetaRequest(text)) {
      console.log(
        chalk.yellow(
          "That is about meero itself — use /settings or /model here, or exit and run: meero setup · meero model",
        ),
      );
      continue;
    }

    try {
      await deps.handleTask(text, session);
    } catch (e) {
      // a broken task must never kill the loop
      console.error(chalk.red(`Error: ${e instanceof Error ? e.message : e}`));
    }
  }

  console.log(chalk.dim("bye ⌁"));
}
