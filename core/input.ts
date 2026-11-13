export function getInput() {
  const args = Bun.argv.slice(2);
  const input = args.join(" ").trim();

  if (!input) {
    console.error("No input provided, exiting.");
    process.exit(1);
  }

  return input;
}

function tryParseArray(s: string): string[] | null {
  try {
    const parsed = JSON.parse(s);
    if (Array.isArray(parsed)) {
      return parsed.filter((c) => typeof c === "string");
    }
  } catch {}
  return null;
}

export function parseCommands(output: string): string[] {
  if (!output) return [];

  // 1. Whole output is already a JSON array (the returnCommands fast path,
  //    also handles quoted commands like ["git commit -m \"msg\""])
  const whole = tryParseArray(output.trim());
  if (whole) return whole;

  // 2. JSON array inside a ``` fenced code block ```
  const fenced = output.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
  if (fenced) {
    const parsed = tryParseArray(fenced[1] ?? "");
    if (parsed) return parsed;
  }

  // 3. Last resort: first [ ... ] span in surrounding prose
  const loose = output.match(/\[[\s\S]*\]/);
  if (loose) {
    const parsed = tryParseArray(loose[0]);
    if (parsed) return parsed;
  }

  return [];
}

/**
 * Collapse runs of whitespace ONLY outside quoted sections, so string
 * literals like `git commit -m "fix:   spacing"` or awk field separators
 * survive normalization untouched.
 */
export function normalizeCommands(cmds: string[]) {
  if (!Array.isArray(cmds)) return [];
  return cmds.map((cmd) =>
    cmd
      .trim()
      .split(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g) // keep quoted runs intact
      .map((chunk, i) => (i % 2 === 1 ? chunk : chunk.replace(/\s+/g, " ")))
      .join(""),
  );
}
