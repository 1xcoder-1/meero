import os from "os";

/** Shells meero knows how to spawn and generate commands for */
export type ShellId = "pwsh" | "powershell" | "cmd" | "bash" | "zsh" | "sh";

export interface ShellInfo {
  id: ShellId;
  /** spawn binary (PATH-resolved name) */
  bin: string;
  /** short human label used by the system prompt */
  label: string;
  /** full argv used to execute one command string */
  argv: (cmd: string) => string[];
}

const KNOWN: readonly string[] = ["pwsh", "powershell", "cmd", "bash", "zsh", "sh"];

function spawnFor(id: ShellId): ShellInfo {
  switch (id) {
    case "pwsh":
    case "powershell":
      return {
        id,
        bin: id,
        label: id === "pwsh" ? "PowerShell 7 (pwsh)" : "Windows PowerShell 5.1",
        argv: (cmd) => [id, "-NoProfile", "-NonInteractive", "-Command", cmd],
      };
    case "cmd":
      return {
        id,
        bin: "cmd",
        label: "cmd.exe",
        argv: (cmd) => ["cmd", "/d", "/s", "/c", cmd],
      };
    case "bash":
      return {
        id,
        bin: "bash",
        label: "bash",
        argv: (cmd) => ["bash", "-c", cmd],
      };
    case "zsh":
      return { id, bin: "zsh", label: "zsh", argv: (cmd) => ["zsh", "-c", cmd] };
    case "sh":
      return { id, bin: "sh", label: "sh", argv: (cmd) => ["sh", "-c", cmd] };
  }
}

/**
 * The shell that will ACTUALLY execute generated commands. The system
 * prompt is built from this, so AI output is always valid syntax for the
 * exact binary that runs it — with zero user configuration.
 * MEERO_SHELL=<id> pins it explicitly (tests / power users).
 */
export function detectShell(): ShellInfo {
  const pin = process.env.MEERO_SHELL?.toLowerCase() as ShellId | undefined;
  if (pin && KNOWN.includes(pin)) return spawnFor(pin);

  if (os.platform() === "win32") {
    // Prefer pwsh 7 when installed (&& / || work, curl is not aliased);
    // Windows PowerShell 5.1 is always present; cmd is a last resort.
    if (Bun.which("pwsh")) return spawnFor("pwsh");
    if (Bun.which("powershell")) return spawnFor("powershell");
    return spawnFor("cmd");
  }

  // POSIX: bash is the safe common denominator; fall back to the login
  // shell when bash is missing, then bare sh.
  if (Bun.which("bash")) return spawnFor("bash");
  const login = (process.env.SHELL ?? "").split(/[\\/]/).pop() ?? "";
  if (login === "zsh" || login === "sh") return spawnFor(login);
  return spawnFor("sh");
}

/** --sandbox mode executes inside the container with `sh -lc` — always POSIX */
export const SANDBOX_SHELL: ShellInfo = {
  ...spawnFor("sh"),
  label: "sh (POSIX) inside the docker sandbox",
  argv: (cmd) => ["sh", "-lc", cmd],
};
