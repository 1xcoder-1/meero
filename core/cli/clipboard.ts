import os from "os";

/**
 * Copy text to the clipboard with the platform's native tool.
 * Text goes in via stdin (Blob) — never interpolated into a command line.
 */
export function copyToClipboard(text: string): boolean {
  const blob = new Blob([text]);
  const run = (cmd: string[]): boolean => {
    try {
      const p = Bun.spawnSync({ cmd, stdin: blob });
      return p.exitCode === 0;
    } catch {
      return false; // tool not installed
    }
  };

  const platform = os.platform();
  if (platform === "win32")
    return run([
      "powershell",
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "$s = [Console]::In.ReadToEnd(); Set-Clipboard -Value $s",
    ]);
  if (platform === "darwin") return run(["pbcopy"]);

  for (const cmd of [
    ["wl-copy"],
    ["xclip", "-selection", "clipboard"],
    ["xsel", "--clipboard", "--input"],
  ]) {
    if (run(cmd)) return true;
  }
  return false;
}
