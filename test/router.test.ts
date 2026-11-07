import { expect, test, describe } from "bun:test";
import { routeInput } from "../core/cli/router";
import { buildCommandsReference, SLASH_COMMANDS } from "../core/cli/reference";

describe("routeInput — slash → pack → meta → chat → ai", () => {
  test("slash commands are caught first and never reach the AI", () => {
    expect(routeInput("/settings")).toEqual({
      kind: "slash",
      name: "settings",
      rest: [],
    });
    expect(routeInput("/model gpt-4o-mini")).toEqual({
      kind: "slash",
      name: "model",
      rest: ["gpt-4o-mini"],
    });
    expect(routeInput("/undo --list")).toEqual({
      kind: "slash",
      name: "undo",
      rest: ["--list"],
    });
    expect(routeInput("/trust low --here")).toEqual({
      kind: "slash",
      name: "trust",
      rest: ["low", "--here"],
    });
  });

  test("the /settings leak is dead — a local command never becomes an AI task", () => {
    for (const slash of ["settings", "help", "commands", "builtin", "undo", "trust", "model", "exit"]) {
      expect(routeInput(`/${slash}`).kind).toBe("slash");
      // and with the CLI name typed in front, the form users actually type
      expect(routeInput(`meero /${slash}`).kind).toBe("slash");
    }
  });

  test("unknown slash words stay local (typo must not spend tokens)", () => {
    const r = routeInput("/setting");
    expect(r.kind).toBe("slash");
    if (r.kind === "slash") expect(r.name).toBe("setting");
  });

  test("built-in packs win over the AI — no pack name reaches the model", () => {
    expect(routeInput("status")).toEqual({
      kind: "pack",
      id: "git-status",
      rest: [],
    });
    expect(routeInput("kill-port 8080")).toEqual({
      kind: "pack",
      id: "kill-port",
      rest: ["8080"],
    });
    expect(routeInput("meero whoport 3000").kind).toBe("pack");
  });

  test("meero-config words are answered locally", () => {
    expect(routeInput("settings").kind).toBe("meta");
    expect(routeInput("meero setup").kind).toBe("meta");
  });

  test("small talk is refused before any model call", () => {
    for (const t of ["hi", "meero hi", "meero how are you", "thanks"]) {
      expect(routeInput(t).kind).toBe("chat");
    }
  });

  test("only real developer tasks reach the AI", () => {
    expect(routeInput("commit all my changes")).toEqual({
      kind: "ai",
      text: "commit all my changes",
    });
    expect(routeInput("meero find files larger than 100mb").kind).toBe("ai");
    // docker is a tool name, not a pack word — the task still goes to the AI
    expect(routeInput("docker ps showing only stopped containers").kind).toBe("ai");
  });

  test("nothing typed means help, not chat", () => {
    expect(routeInput("").kind).toBe("help");
    expect(routeInput("   ").kind).toBe("help");
    expect(routeInput("meero").kind).toBe("help");
    expect(routeInput("meero meero").kind).toBe("help");
  });
});

describe("commands reference page", () => {
  test("names every slash command and the pack groups", () => {
    const page = buildCommandsReference();
    for (const c of SLASH_COMMANDS) expect(page).toContain(`meero ${c.name}`);
    expect(page).toContain("SLASH COMMANDS");
    expect(page).toContain("PRE-BUILT PACKS");
    expect(page).toContain("git-status");
  });

  test("is generated from the live catalog, not a stale hand list", () => {
    const page = buildCommandsReference();
    expect(page).toMatch(/\d+ packs listed/);
  });
});
