import { describe, expect, test } from "bun:test";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  getCapturedCommands,
  isSensitivePath,
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

describe("secret file deny-list", () => {
  const root = mkdtempSync(join(tmpdir(), "meero-secret-"));
  const SECRET = "API_KEY=super-secret-value";
  const call = async (name: keyof typeof tools, input: Record<string, unknown>) => {
    const exec = (
      tools[name] as {
        execute?: (i: unknown, o: unknown) => Promise<unknown>;
      }
    ).execute;
    if (!exec) throw new Error(`tool ${name} has no execute`);
    return String(await exec(input, { toolCallId: name, messages: [] }));
  };

  const put = (rel: string) => {
    const full = join(root, rel);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, SECRET);
    return full;
  };

  const sensitive = [
    ".env",
    ".env.local",
    join(".meero", "config.json"),
    join(".ssh", "id_rsa"),
    join(".aws", "credentials"),
    "server.pem",
    ".npmrc",
    ".git-credentials",
  ].map(put);

  for (const full of sensitive) {
    test(`readFile refuses ${full.slice(root.length)}`, async () => {
      const result = await call("readFile", { path: full });
      expect(result).toContain("denied");
      expect(result).not.toContain("super-secret-value");
    });

    test(`readFileLines refuses ${full.slice(root.length)}`, async () => {
      const result = await call("readFileLines", { path: full });
      expect(result).toContain("denied");
      expect(result).not.toContain("super-secret-value");
    });
  }

  test("searchFiles refuses a sensitive directory", async () => {
    const result = await call("searchFiles", {
      query: "API_KEY",
      path: join(root, ".ssh"),
    });
    expect(result).toContain("denied");
    expect(result).not.toContain("super-secret-value");
  });

  test("readFile still reads ordinary files", async () => {
    const full = put("notes.txt");
    const result = await call("readFile", { path: full });
    expect(result).toContain(SECRET);
  });

  test("isSensitivePath does not false-positive on ordinary names", () => {
    expect(isSensitivePath(join(root, "environment.ts"))).toBe(false);
    expect(isSensitivePath(join(root, "src", "env.ts"))).toBe(false);
    expect(isSensitivePath(join(root, "my.npmrc.sample"))).toBe(false);
    expect(isSensitivePath(join(root, "token.pem.asc"))).toBe(false);
    expect(isSensitivePath(join(root, ".env.local"))).toBe(true);
    expect(isSensitivePath(join(root, ".ssh", "id_rsa"))).toBe(true);
  });
});
