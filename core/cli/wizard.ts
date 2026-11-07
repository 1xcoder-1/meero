import { input } from "@inquirer/prompts";
import boxen from "boxen";
import chalk from "chalk";
import type { ModelMessage } from "ai";
import { isMetaRequest } from "./meta";

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
}

const WELCOME = `
  ✨ meero wizard — keep typing tasks; context carries between them.

    just text        generate + run a task
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
    meero help            CLI flags & commands (outside the wizard)

  WIZARD
    /settings             view + change model, provider, cheap mode
    /model [name]         switch the AI model (fetches the provider's list)
    /undo                 revert the last task's file changes
    /trust low|med|high   confirmation strictness (this session)
    /exit                 leave

  CLI
    meero setup           configure provider + API key + model
    meero model           switch the active model
    meero undo [id|--list]
    meero history [--clear]
    meero trust [level] [--here]
    meero local on|off|status        (Ollama cheap mode)
    meero recipe list|rm|export|import
    meero run <name>      replay a saved recipe
    meero reset           remove the config
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
