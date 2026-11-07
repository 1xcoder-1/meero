import { describe, test, expect } from "bun:test";
import { isMetaRequest } from "../core/cli/meta";

describe("meta-request guard", () => {
  test("requests about meero itself are meta", () => {
    const yes = [
      "meero setup",
      "meero steup", // real-world typo that once triggered a web search
      "meero settings",
      "meero config",
      "meero configuration",
      "meero model",
      "meero change model",
      "meero switch model",
      "setup",
      "steup",
      "settings",
      "config",
      "configuration",
      "meero setup!",
      "settings?",
      "  meero setup  ",
      "miro setup",
    ];
    for (const t of yes) expect(isMetaRequest(t)).toBeTrue();
  });

  test("real tasks are never meta", () => {
    const no = [
      "",
      "setup a node project",
      "setup the database",
      "configure nginx",
      "model a schema from json",
      "change my model of the car",
      "switch model provider settings in my app",
      "commit all my changes",
      "port 3000 band karo",
      "meero setup the database",
      "help me setup",
    ];
    for (const t of no) expect(isMetaRequest(t)).toBeFalse();
  });
});
