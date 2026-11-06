import { expect, test, describe } from "bun:test";
import { buildFixPrompt, MAX_FIX_ROUNDS, tailOutput } from "../core/cli/repair";

describe("tailOutput", () => {
  test("short output passes through untouched", () => {
    expect(tailOutput("plain error")).toBe("plain error");
  });

  test("long output keeps head and tail, marks truncation", () => {
    const big = "H".repeat(1000) + "M".repeat(10_000) + "T".repeat(1000);
    const out = tailOutput(big, 2600);
    expect(out.length).toBeLessThan(big.length);
    expect(out.startsWith("HHHH")).toBe(true);
    expect(out.endsWith("TTTT")).toBe(true);
    expect(out).toContain("[output truncated]");
  });
});

describe("buildFixPrompt", () => {
  const prompt = buildFixPrompt({
    task: "install bun globally",
    failedCmd: "npm install -g bun",
    exitCode: 127,
    output: "npm: command not found",
    succeeded: ["cd ~", "mkdir x"],
    remaining: 1,
    round: 2,
  });

  test("carries the failure evidence", () => {
    expect(prompt).toContain("install bun globally");
    expect(prompt).toContain("npm install -g bun");
    expect(prompt).toContain("exit code 127");
    expect(prompt).toContain("npm: command not found");
  });

  test("lists successful commands as never-repeat", () => {
    expect(prompt).toContain("NEVER repeat these");
    expect(prompt).toContain("mkdir x");
  });

  test("instructs structured returnCommands output and round budget", () => {
    expect(prompt).toContain("returnCommands");
    expect(prompt).toContain(`2/${MAX_FIX_ROUNDS}`);
    expect(prompt).toContain("1 further command(s)");
  });

  test("no-successes case says so instead of empty list", () => {
    const p = buildFixPrompt({
      task: "t",
      failedCmd: "c",
      exitCode: 1,
      output: "",
      succeeded: [],
      remaining: 0,
      round: 1,
    });
    expect(p).toContain("No commands have succeeded yet.");
    expect(p).not.toContain("further command(s)");
  });
});
