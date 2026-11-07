/**
 * The full command reference behind `meero commands` / `meero /commands`.
 * It is generated from the real pack catalog instead of a hand-typed list,
 * so adding a built-in updates this page by itself (and a test proves the
 * slash section names every route the CLI understands).
 */
import { listBuiltins } from "./builtin";

/** Every slash command the router accepts, in menu order */
export const SLASH_COMMANDS: { name: string; desc: string }[] = [
  { name: "/settings", desc: "model, provider and cheap mode in one page" },
  { name: "/model", desc: "list / switch the active model" },
  { name: "/builtin", desc: "browse and run the pre-built packs (no AI)" },
  { name: "/undo", desc: "revert files changed by the last task" },
  { name: "/trust", desc: "low | med | high — confirmation strictness" },
  { name: "/commands", desc: "this reference" },
  { name: "/help", desc: "the short help box" },
  { name: "/exit", desc: "nothing to exit — meero runs one task per call" },
];

const FLAGS: readonly (readonly [string, string])[] = [
  ["--print / --dry-run", "generate only; show, never execute"],
  ["--copy", "generate and copy to clipboard"],
  ["--trust low|med|high", "confirmation strictness for this run"],
  ["--local", "prefer a local Ollama model (cheap mode)"],
  ["--sandbox [image]", "run in a throwaway docker container"],
];

const CLI_COMMANDS: readonly (readonly [string, string])[] = [
  ["meero \"<task>\"", "AI generates and runs shell commands"],
  ["meero <pack> [args]", "run a pre-built pack directly, no AI"],
  ["meero /<command>", "same commands in slash form"],
  ["meero setup / settings / model", "configure provider, key, model"],
  ["meero undo [id] [--list]", "revert a task's file changes"],
  ["meero history [--clear]", "recent tasks and outcomes"],
  ["meero trust [level] [--here]", "confirmation strictness"],
  ["meero local on|off|status", "Ollama cheap-mode routing"],
  ["meero recipe list|rm|export|import", "saved playbooks"],
  ["meero run <name>", "execute a saved recipe, no LLM"],
  ["meero builtin [id] [args]", "pre-built pack menu"],
  ["meero commands", "this reference"],
  ["meero help", "short help box"],
];

/** One indented "name   description" block, names padded to a readable column */
function table(rows: readonly (readonly [string, string])[]): string {
  const width = Math.max(...rows.map(([name]) => name.length));
  return rows
    .map(([name, desc]) => `    ${name.padEnd(width)}  ${desc}`)
    .join("\n");
}

export function buildCommandsReference(): string {
  const packs = listBuiltins();
  const groups = [...new Set(packs.map((c) => c.group))];

  const packBlocks = groups.map((group) => {
    const rows = packs
      .filter((c) => c.group === group)
      .map((c) => [c.id, c.desc] as const);
    return `  ${group.toUpperCase()}\n${table(rows)}`;
  });

  return [
    "",
    "  TASKS",
    table([
      ["meero \"find large files over 100mb\"", "AI writes the commands for your shell"],
      ["meero commit all my changes", "AI task, typed without quotes too"],
    ]),
    "",
    "  SLASH COMMANDS  (identical to the plain subcommands)",
    table(SLASH_COMMANDS.map((c) => [`meero ${c.name}`, c.desc] as const)),
    "",
    "  PRE-BUILT PACKS  (no AI, no cost — short aliases work too)",
    ...packBlocks,
    "",
    "  CLI",
    table(CLI_COMMANDS),
    "",
    "  FLAGS",
    table(FLAGS),
    "",
    "  ALWAYS ON",
    "    safety gate · blast-radius preview · web cross-check · self-repair",
    "    undo snapshots · cost line · shell auto-detect · chat guardrail",
    "",
    `  ${packs.length} packs listed — meero /builtin is the interactive menu.`,
    "",
  ].join("\n");
}
