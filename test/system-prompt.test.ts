import { describe, test, expect } from "bun:test";
import { SYSTEM_PROMPT, buildSystemPrompt } from "../core/ai/system-prompt";
import { detectShell, SANDBOX_SHELL, type ShellInfo } from "../core/cli/shell";

function fakeShell(id: ShellInfo["id"]): ShellInfo {
  return {
    id,
    bin: id,
    label: `label:${id}`,
    argv: (cmd) => [id, "-c", cmd],
  };
}

describe("system prompt shell contract", () => {
  test("prompt names the executing shell and its exact spawn form", () => {
    const p = buildSystemPrompt(fakeShell("pwsh"));
    expect(p).toContain("Executing shell: label:pwsh");
    expect(p).toContain("pwsh -c <command>");
  });

  test("powershell prompts forbid cmd.exe AND bash syntax", () => {
    for (const id of ["pwsh", "powershell"] as const) {
      const p = buildSystemPrompt(fakeShell(id));
      expect(p).toMatch(/NEVER generate cmd\.exe syntax/);
      expect(p).toMatch(/NEVER generate bash\/POSIX syntax/);
      expect(p).toContain("Get-NetTCPConnection");
    }
  });

  test("Windows PowerShell 5.1 prompt forbids && and pushes curl.exe", () => {
    const p = buildSystemPrompt(fakeShell("powershell"));
    expect(p).toContain("NEVER use && or ||");
    expect(p).toContain("curl.exe");
  });

  test("pwsh 7 prompt allows && chains", () => {
    const p = buildSystemPrompt(fakeShell("pwsh"));
    expect(p).toContain("&& and || chain operators work");
    expect(p).not.toContain("NEVER use && or ||");
  });

  test("cmd prompt keeps cmd.exe syntax only", () => {
    const p = buildSystemPrompt(fakeShell("cmd"));
    expect(p).toContain("ONLY cmd.exe syntax");
    expect(p).toContain("findstr");
  });

  test("POSIX prompts allow grep/find and clear example", () => {
    const p = buildSystemPrompt(fakeShell("bash"));
    expect(p).toContain("ONLY POSIX (bash) syntax");
    expect(p).toContain('"clear terminal"          → ["clear"]');
  });

  test("direct-mode examples are shell-correct", () => {
    expect(buildSystemPrompt(fakeShell("powershell"))).toContain(
      '"clear terminal"          → ["Clear-Host"]',
    );
    expect(buildSystemPrompt(fakeShell("cmd"))).toContain(
      '"clear terminal"          → ["cls"]',
    );
    expect(buildSystemPrompt(fakeShell("powershell"))).toContain(
      "Get-Command meero",
    );
    expect(buildSystemPrompt(fakeShell("bash"))).toContain("which meero");
  });

  test("default SYSTEM_PROMPT is built from the real detected shell", () => {
    expect(SYSTEM_PROMPT).toContain(`Executing shell: ${detectShell().label}`);
  });

  test("sandbox prompt describes POSIX sh inside docker", () => {
    const p = buildSystemPrompt(SANDBOX_SHELL);
    expect(p).toContain("docker sandbox");
    expect(p).toContain("ONLY POSIX (sh) syntax");
  });

  test("prompt forbids treating meero-the-CLI as installable third-party software", () => {
    for (const id of ["pwsh", "bash"] as const) {
      const p = buildSystemPrompt(fakeShell(id));
      expect(p).toContain('"meero" MEANS THIS CLI');
      expect(p).toContain("NEVER generate install commands");
    }
  });
});
