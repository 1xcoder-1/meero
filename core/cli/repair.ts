/** How many AI repair rounds a single task may use before giving up */
export const MAX_FIX_ROUNDS = 3;

/**
 * When a generated command fails mid-task, this becomes the next LLM
 * prompt: the failed command, its real output, and what already succeeded,
 * so the model can return just the corrected remaining commands.
 */
export function buildFixPrompt(opts: {
  task: string;
  failedCmd: string;
  exitCode: number;
  output: string;
  succeeded: string[];
  remaining: number;
  round: number;
}): string {
  const done =
    opts.succeeded.length > 0
      ? `Commands that already succeeded (NEVER repeat these):\n${opts.succeeded
          .map((c) => `  ${c}`)
          .join("\n")}`
      : "No commands have succeeded yet.";

  return [
    `One of the commands you generated FAILED during execution.`,
    `Task: "${opts.task}"`,
    `Failed command (exit code ${opts.exitCode}):`,
    `  ${opts.failedCmd}`,
    `Its output (possibly truncated):`,
    "```",
    tailOutput(opts.output),
    "```",
    done,
    opts.remaining > 0
      ? `${opts.remaining} further command(s) from the original plan were NOT run yet.`
      : "",
    `Repair attempt ${opts.round}/${MAX_FIX_ROUNDS}. Return ONLY the corrected remaining commands (starting with a replacement for the failed one) via the returnCommands tool — do not restart the task from scratch and do not repeat successful steps. If the task cannot be completed safely, return an empty array.`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Keep the beginning (context) and the end (the actual error) of long
 * command output; models rarely need the middle of a 40k-line build log.
 */
export function tailOutput(output: string, max = 2600): string {
  if (output.length <= max) return output;
  const head = output.slice(0, 500);
  const tail = output.slice(-(max - 500));
  return head + "\n…[output truncated]…\n" + tail;
}
