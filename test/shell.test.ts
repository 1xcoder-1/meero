import { describe, test, expect, afterAll } from "bun:test";
import os from "os";
import {
  detectShell,
  SANDBOX_SHELL,
  type ShellId,
} from "../core/cli/shell";
import { runCMDCapture } from "../core/cli/run";

const prevPin = process.env.MEERO_SHELL;
afterAll(() => {
  if (prevPin === undefined) delete process.env.MEERO_SHELL;
  else process.env.MEERO_SHELL = prevPin;
});

function pin(id: ShellId | undefined) {
  if (id === undefined) delete process.env.MEERO_SHELL;
  else process.env.MEERO_SHELL = id;
}

describe("detectShell", () => {
  test("MEERO_SHELL pins the exact shell and spawn argv", () => {
    pin("pwsh");
    const p = detectShell();
    expect(p.id).toBe("pwsh");
    expect(p.argv("x").slice(1, 4)).toEqual([
      "-NoProfile",
      "-NonInteractive",
      "-Command",
    ]);

    pin("powershell");
    expect(detectShell().id).toBe("powershell");

    pin("cmd");
    expect(detectShell().argv("dir").slice(0, 1)).toEqual(["cmd"]);

    pin("bash");
    expect(detectShell().argv("ls").slice(0, 2)).toEqual(["bash", "-c"]);

    pin("zsh");
    expect(detectShell().argv("ls").slice(0, 2)).toEqual(["zsh", "-c"]);

    pin("sh");
    expect(detectShell().id).toBe("sh");
  });

  test("unknown MEERO_SHELL values fall back to auto-detection", () => {
    pin(undefined);
    const auto = detectShell().id;
    pin("nonsense-shell" as ShellId);
    expect(detectShell().id).toBe(auto);
  });

  test("auto-detection never picks an unknown shell family", () => {
    pin(undefined);
    const s = detectShell();
    if (os.platform() === "win32") {
      expect(["pwsh", "powershell", "cmd"]).toContain(s.id);
    } else {
      expect(["bash", "zsh", "sh"]).toContain(s.id);
    }
  });

  test("sandbox shell is POSIX sh executed with -lc", () => {
    expect(SANDBOX_SHELL.id).toBe("sh");
    expect(SANDBOX_SHELL.argv("ls").slice(0, 2)).toEqual(["sh", "-lc"]);
  });
});

describe("shell/executor contract", () => {
  test("runCMDCapture executes through the detected shell (echo works everywhere)", async () => {
    pin(undefined);
    const r = await runCMDCapture("echo shell-contract-ok-7x3");
    expect(r.exitCode).toBe(0);
    expect(r.output).toContain("shell-contract-ok-7x3");
  });

  test("cmd.exe syntax fails in the powershell executor — why the prompt forbids it", async () => {
    if (os.platform() !== "win32") return;
    pin("powershell");
    const r = await runCMDCapture(
      'for /f "tokens=1" %a in (\'echo hi\') do @echo %a',
    );
    expect(r.exitCode).not.toBe(0);
  });
});
