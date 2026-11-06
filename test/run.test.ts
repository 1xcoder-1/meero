import { expect, test, describe } from "bun:test";
import { runCMDCapture } from "../core/cli/run";

describe("runCMDCapture", () => {
  test("captures stdout of a successful command", async () => {
    const r = await runCMDCapture("echo capture-me-9x7");
    expect(r.exitCode).toBe(0);
    expect(r.output).toContain("capture-me-9x7");
  });

  test("returns non-zero exit code instead of throwing", async () => {
    const r = await runCMDCapture("exit 7");
    expect(r.exitCode).toBe(7);
  });

  test("captures stderr text", async () => {
    // "exit" is harmless; a bogus command must produce SOME error output
    const r = await runCMDCapture("definitely-not-a-real-command-qvz");
    expect(r.exitCode).not.toBe(0);
    expect(r.output.length).toBeGreaterThan(0);
  });
});
