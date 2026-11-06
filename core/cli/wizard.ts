import { input } from "@inquirer/prompts";
import boxen from "boxen";
import chalk from "chalk";
import type { ModelMessage } from "ai";

export interface WizardDeps {
  /** runs one natural-language task through the full generate→confirm→execute pipeline */
  handleTask: (text: string, session: ModelMessage[]) => Promise<void>;
  /** /undo — reverts the last snapshot, printing the same summary as `meero undo` */
  runUndo: () => void;
  /** /trust <level> — changes trust for this session only */
  setSessionTrust?: (level: string) => void;
}

const WELCOME = `
  ✨ meero wizard — keep typing tasks; context carries between them.

    just text        generate + run a task
    ${chalk.cyan("/undo")}          revert the last task's file changes
    ${chalk.cyan("/trust low|med|high")}  change confirm strictness (this session)
    ${chalk.cyan("/help")}          this cheat sheet
    ${chalk.cyan("/exit")}          leave (Ctrl+C works too)
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

    try {
      await deps.handleTask(text, session);
    } catch (e) {
      // a broken task must never kill the loop
      console.error(chalk.red(`Error: ${e instanceof Error ? e.message : e}`));
    }
  }

  console.log(chalk.dim("bye ⌁"));
}
