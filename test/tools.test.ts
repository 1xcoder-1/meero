import { describe, expect, test } from "bun:test";
import {
  getCapturedCommands,
  resetCapturedCommands,
  tools,
} from "../core/ai/tools";

describe("returnCommands tool", () => {
  test("captures structured commands", async () => {
    resetCapturedCommands();
    expect(getCapturedCommands()).toBeNull();

    const exec = tools.returnCommands.execute!;
    const result = await exec(
      { commands: ['git commit -m "real message"', "git push"] },
      { toolCallId: "test-1", messages: [] },
    );

    expect(result).toEqual({ status: "ok", count: 2 });
    expect(getCapturedCommands()).toEqual([
      'git commit -m "real message"',
      "git push",
    ]);
  });

  test("reset clears previous capture", async () => {
    const exec = tools.returnCommands.execute!;
    await exec({ commands: ["ls"] }, { toolCallId: "test-2", messages: [] });
    expect(getCapturedCommands()).toEqual(["ls"]);

    resetCapturedCommands();
    expect(getCapturedCommands()).toBeNull();
  });

  test("empty array (unsafe task) is capturable", async () => {
    resetCapturedCommands();
    const exec = tools.returnCommands.execute!;
    await exec({ commands: [] }, { toolCallId: "test-3", messages: [] });
    expect(getCapturedCommands()).toEqual([]);
  });
});
