import { input } from "@inquirer/prompts";
import boxen from "boxen";
import chalk from "chalk";
import { previewCommands } from "./snapshot";
import { webSearchTop, type WebSearchResult } from "../ai/tools";

/**
 * Runtime safety gate: classify commands BEFORE executing them.
 * Prompt-level instructions in the system prompt are best-effort; this is
 * the actual enforcement layer that no jailbroken model output can bypass.
 */

const DANGEROUS_TARGETS: RegExp[] = [
  // Unix root and root glob: "/" or "/*"
  /(^|\s)\/(\s|$|\*)/,
  // System directories: /bin /etc /usr /var /home /root /dev /sys /proc /lib /sbin /boot /run /srv
  /(^|\s)\/(bin|boot|dev|etc|home|lib|proc|root|run|sbin|srv|sys|usr|var)(\/|\s|$)/,
  // Home: ~, ~/..., $HOME
  /(^|\s)~(\/|\s|$)/,
  /\$HOME|\$\{HOME\}/i,
  // Windows drive roots and known system folders: C:\, C:\*, C:\Users, C:\Windows, C:\Program Files
  /(^|\s)[a-z]:\\?(\s|$|\*)/i,
  /(^|\s)[a-z]:\\?(users|program files|windows)/i,
  // Bare glob targeting everything
  /(^|\s)\*(\s|$)/,
];

function hasDangerousTarget(cmd: string): boolean {
  return DANGEROUS_TARGETS.some((re) => re.test(cmd));
}

/**
 * Returns a human-readable reason when the command is dangerous,
 * or null when it looks safe to run.
 */
export function inspectCommand(cmd: string): string | null {
  const lower = cmd.toLowerCase().trim();
  if (!lower) return null;

  // Downloaded code piped straight into a shell / interpreter
  if (
    /(curl|wget|iwr|invoke-webrequest)[^|;&]*\|\s*(sudo\s+)?(bash|sh|zsh|dash|iex|invoke-expression|node|python)/.test(
      lower,
    )
  )
    return "pipes a downloaded script directly into a shell";

  // Disk / volume destruction
  if (/\b(mkfs(\.\w+)?|diskpart)\b/.test(lower))
    return "formats or re-initialises a disk volume";
  if (/\bformat(\s+-\w+)*\s+[a-z]:/i.test(lower) || /\bformat-volume\b/.test(lower))
    return "formats a Windows volume";
  if (/\bdd\b[^|;&]*\bof=\/dev\//.test(lower) || /\bset-diskconfiguration\b/.test(lower))
    return "writes raw data to a disk device";
  if (/>\s*\/dev\/(sd|nvme|disk|hd|mapper)/.test(lower))
    return "overwrites a disk device";

  // Power operations
  if (
    /(^|[;&|]\s*)(sudo\s+)?(shutdown|reboot|halt|poweroff)\b/.test(lower) ||
    /\b(stop-computer|restart-computer)\b/.test(lower)
  )
    return "powers off or restarts the machine";

  // Fork bomb
  if (/:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;:/.test(lower))
    return "fork bomb (will exhaust system processes)";

  // Permissions on system paths
  if (/\b(chmod|chown)\b.*(-r|--recursive)\b.*\s\/(\s|$|\*)/.test(lower))
    return "recursively changes permissions on system paths";

  // Recursive force deletes (rm / del / rd / Remove-Item) targeting dangerous paths
  const rmForceRecursive =
    /(^|[;&|]\s*)(sudo\s+)?rm\b[^|;&]*(-\w*(rf|fr)\w*|--recursive[^|;&]*--force|--force[^|;&]*--recursive)/
      .test(lower) ||
    /(^|[;&|]\s*)(remove-item|ri)\b[^|;&]*-recur[a-z]*[^|;&]*-fo?[rc]{1,3}a?c?e?/.test(
      lower,
    ) ||
    /(^|[;&|]\s*)(remove-item|ri)\b[^|;&]*-fo?[rc]{1,3}a?c?e?[^|;&]*-recur[a-z]*/.test(
      lower,
    ) ||
    /(^|[;&|]\s*)del\b[^|;&]*\/s[^|;&]*\/q/.test(lower) ||
    /(^|[;&|]\s*)del\b[^|;&]*\/q[^|;&]*\/s/.test(lower) ||
    /(^|[;&|]\s*)(rd|rmdir)\b[^|;&]*\/s[^|;&]*\/q/.test(lower) ||
    /(^|[;&|]\s*)(rd|rmdir)\b[^|;&]*\/q[^|;&]*\/s/.test(lower);

  if (rmForceRecursive && hasDangerousTarget(lower))
    return "recursive force-delete targeting a system/root path";

  // Registry destruction
  if (
    /\breg\s+delete\b/.test(lower) ||
    /remove-item[^|;&]*hklm:|remove-item[^|;&]*hkcu:/.test(lower)
  )
    return "deletes Windows registry keys";

  // Database destruction
  if (
    /\b(drop\s+(table|database)|truncate\s+table)\b/.test(lower) ||
    /\bdelete\s+from\s+\S+\s*;?\s*$/.test(lower)
  )
    return "destroys database contents";

  // Destructive git operations
  if (/\bgit\s+push\b[^|;&]*(--force(?!-with-lease)|\s-f(\s|$))/.test(lower))
    return "force-push rewrites remote history";
  if (/\bgit\s+reset\s+--hard\b/.test(lower))
    return "discards all uncommitted changes";
  if (/\bgit\s+clean\s+[^|;&]*-([a-z]*f[a-z]*d[a-z]*|[a-z]*d[a-z]*f[a-z]*)/.test(lower))
    return "permanently deletes untracked files";

  // Shell/config wipes
  if (/\bhistory\s+-c\b/.test(lower) || /\bunset\s+-f\b/.test(lower))
    return "clears shell history/functions";

  return null;
}

export function findDangerous(commands: string[]) {
  return commands
    .map((cmd) => ({ cmd, reason: inspectCommand(cmd) }))
    .filter((f): f is { cmd: string; reason: string } => f.reason !== null);
}

/**
 * Tier-3 cross-check: for a dangerous command, pull a few independent web
 * references so the user sees documentation/context next to the warning.
 * Best-effort with a hard time budget — never blocks the gate itself.
 */
export async function crossCheckRefs(
  cmd: string,
  timeoutMs = 6000,
): Promise<string[]> {
  const q = cmd
    .replace(/["']/g, "")
    .split(/\s+/)
    .slice(0, 5)
    .join(" ");
  const results: WebSearchResult[] = await Promise.race([
    webSearchTop(`${q} command what it does risk`, 3),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("search timeout")), timeoutMs),
    ),
  ]);
  return results
    .filter((r) => r.url && /^https?:\/\//.test(r.url))
    .map((r) => `  ${chalk.dim(`🔎 ${r.title}`)}\n  ${chalk.underline(r.url)}`);
}

/**
 * Blocks execution until the user explicitly types "confirm"
 * when any dangerous command is present. Ctrl+C / anything else cancels.
 */
export async function safetyGate(commands: string[]) {
  const flagged = findDangerous(commands);
  if (flagged.length === 0) return;

  // Dry-run preview: show the concrete blast radius before asking to confirm
  const preview = previewCommands(flagged.map((f) => f.cmd));
  const previewSection =
    preview.length > 0
      ? `\n${chalk.bold("WHAT WILL ACTUALLY CHANGE")}\n${preview.join("\n")}`
      : "";

  // Web cross-check (skippable offline; best-effort)
  let refSection = "";
  if (!process.env.MEERO_OFFLINE) {
    try {
      const refs = await crossCheckRefs(flagged[0]?.cmd ?? commands[0] ?? "");
      if (refs.length > 0)
        refSection = `\n${chalk.bold("WEB REFERENCES")}\n${refs.join("\n")}`;
    } catch {
      // search unavailable — the gate still works without citations
    }
  }

  console.log(
    boxen(
      flagged
        .map(
          (f) =>
            `${chalk.red("⚠ ")}${chalk.bold(f.cmd)}\n  ${chalk.dim(f.reason)}`,
        )
        .join("\n\n") + previewSection + refSection,
      {
        padding: 1,
        borderStyle: "round",
        borderColor: "red",
        title: "DANGEROUS COMMANDS DETECTED",
        titleAlignment: "left",
      },
    ),
  );

  try {
    await input({
      message: `Type ${chalk.bold("confirm")} to run ${flagged.length} dangerous command(s) — Ctrl+C to abort:`,
      validate: (v) =>
        v.trim().toLowerCase() === "confirm" || `Type exactly: confirm`,
    });
  } catch {
    // Ctrl+C / ESC
    console.log(chalk.yellow("Aborted. Nothing was executed."));
    process.exit(0);
  }
}
