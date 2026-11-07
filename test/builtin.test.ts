import { expect, test, describe } from "bun:test";
import os from "os";
import {
  ALIAS_NAMES,
  fillParams,
  getBuiltin,
  getBuiltinInput,
  isBuiltinRisky,
  listBuiltins,
  resolveBuiltin,
  resolveVariantKeys,
  type BuiltinCmd,
} from "../core/cli/builtin";
import { detectShell, type ShellInfo } from "../core/cli/shell";

const SHELL_IDS = ["pwsh", "powershell", "cmd", "bash", "zsh", "sh"] as const;

/** Shells detectShell() can actually return on this host */
const HOST_SHELLS = (
  os.platform() === "win32" ? ["pwsh", "powershell", "cmd"] : ["bash", "zsh", "sh"]
) as (typeof SHELL_IDS)[number][];

/** detectShell() honours the MEERO_SHELL pin — the clean way to fake shells */
function shellFor(id: (typeof SHELL_IDS)[number]): ShellInfo {
  const prev = process.env.MEERO_SHELL;
  process.env.MEERO_SHELL = id;
  try {
    return detectShell();
  } finally {
    if (prev === undefined) delete process.env.MEERO_SHELL;
    else process.env.MEERO_SHELL = prev;
  }
}

/** Minimal entry used to probe resolution priority in isolation */
function entry(variants: BuiltinCmd["variants"]): BuiltinCmd {
  return {
    id: "probe",
    label: "probe",
    group: "system",
    desc: "",
    variants,
  };
}

describe("builtins catalog", () => {
  test("ships 55-70 packs with unique ids and full metadata", () => {
    const all = listBuiltins();
    expect(all.length).toBeGreaterThanOrEqual(55);
    expect(all.length).toBeLessThanOrEqual(70);
    expect(new Set(all.map((c) => c.id)).size).toBe(all.length);
    for (const c of all) {
      expect(c.label.length).toBeGreaterThan(0);
      expect(c.desc.length).toBeGreaterThan(0);
      expect(Object.values(c.variants).flat().length).toBeGreaterThan(0);
    }
  });

  test("every menu pack resolves commands on every shell this host can run", () => {
    for (const c of listBuiltins()) {
      for (const id of HOST_SHELLS) {
        const { commands } = resolveBuiltin(c, shellFor(id));
        expect(commands.length).toBeGreaterThan(0);
      }
    }
  });

  test("platform-locked packs are filtered off other platforms", () => {
    const onMenu = listBuiltins().map((c) => c.id);
    if (os.platform() === "win32") expect(onMenu).toContain("update-choco");
    else expect(onMenu).not.toContain("update-choco");
  });

  test("windows-only pack still resolves for every windows shell (pinned)", () => {
    const choco = getBuiltin("update-choco")!;
    for (const id of ["pwsh", "powershell", "cmd"] as const) {
      expect(resolveBuiltin(choco, shellFor(id)).commands.length).toBeGreaterThan(0);
    }
  });

  test("getBuiltin is case-insensitive and misses cleanly", () => {
    expect(getBuiltin("KILL-PORT")?.id).toBe("kill-port");
    expect(getBuiltin("nope")).toBeNull();
  });
});

describe("direct commands (run packs without the builtin word)", () => {
  /** meero's own registered commands — aliases must never shadow these */
  const RESERVED = [
    "setup", "model", "reset", "undo", "history", "trust", "local",
    "recipe", "recipes", "run", "builtin", "builtins", "help", "version",
  ];

  test("aliases are unique and never shadow pack ids or meero commands", () => {
    const all = listBuiltins();
    const ids = new Set(all.map((c) => c.id));
    const inputs = new Set([...ids, ...RESERVED]);
    for (const alias of ALIAS_NAMES) {
      expect(inputs.has(alias)).toBe(false);
      inputs.add(alias);
    }
  });

  test("aliases resolve to the right pack", () => {
    expect(getBuiltinInput("status")?.id).toBe("git-status");
    expect(getBuiltinInput("ps")?.id).toBe("docker-ps");
    expect(getBuiltinInput("killport")?.id).toBe("kill-port");
    expect(getBuiltinInput("choco")?.id).toBe("update-choco");
    expect(getBuiltinInput("whoport")?.id).toBe("who-on-port");
    expect(getBuiltinInput("test")?.id).toBe("npm-test");
  });

  test("full ids still win and stay case-insensitive", () => {
    expect(getBuiltinInput("GIT-STATUS")?.id).toBe("git-status");
    expect(getBuiltinInput("Kill-Port")?.id).toBe("kill-port");
  });

  test("non-commands (even casual words) miss cleanly — AI path keeps working", () => {
    expect(getBuiltinInput("nope")).toBeNull();
    expect(getBuiltinInput("hi")).toBeNull();
    expect(getBuiltinInput("")).toBeNull();
  });
});

describe("variant resolution", () => {
  test("exact shell variant wins over OS and generic variants", () => {
    const e = entry({ powershell: ["ps1"], windows: ["win"], any: ["any"] });
    expect(resolveBuiltin(e, shellFor("powershell")).key).toBe("powershell");
    expect(resolveBuiltin(e, shellFor("cmd")).key).toBe("windows");
  });

  test("pwsh falls back to the powershell variant via family alias", () => {
    const e = entry({ powershell: ["ps1"] });
    const r = resolveBuiltin(e, shellFor("pwsh"));
    expect(r.key).toBe("powershell");
    expect(r.commands).toEqual(["ps1"]);
  });

  test("zsh falls back to bash before OS-specific variants", () => {
    const e = entry({ bash: ["bash-v"], macos: ["mac-v"] });
    expect(resolveBuiltin(e, shellFor("zsh")).key).toBe("bash");
    expect(resolveBuiltin(e, shellFor("zsh")).commands).toEqual(["bash-v"]);
  });

  test("host OS variant is preferred over posix for bash-family shells", () => {
    const e = entry({
      posix: ["posix-v"],
      windows: ["win-v"],
      linux: ["linux-v"],
      macos: ["mac-v"],
    });
    const r = resolveBuiltin(e, shellFor("bash"));
    expect(r.key).not.toBe("posix");
    expect(r.key).not.toBe("any");
  });

  test("any is the last resort for every shell", () => {
    const e = entry({ any: ["universal"] });
    for (const id of SHELL_IDS) {
      const r = resolveBuiltin(e, shellFor(id));
      expect(r.key).toBe("any");
      expect(r.commands).toEqual(["universal"]);
    }
  });

  test("resolution key order is exact → alias → OS → family → any", () => {
    const keys = resolveVariantKeys(shellFor("zsh"));
    expect(keys[0]).toBe("zsh");
    expect(keys).toContain("bash");
    expect(keys[keys.length - 1]).toBe("any");
  });
});

describe("params", () => {
  test("positional values replace every {token} occurrence", () => {
    const kill = getBuiltin("kill-port")!;
    const out = fillParams(kill.variants.posix!, kill, { port: "8080" });
    expect(out[0]).toBe("lsof -ti:8080 | xargs kill -9");
    expect(out.join("\n")).not.toContain("{port}");
  });

  test("missing values fall back to the declared defaults", () => {
    const kill = getBuiltin("kill-port")!;
    const out = fillParams(kill.variants.posix!, kill, {});
    expect(out[0]).toContain("lsof -ti:3000");
  });
});

describe("smart auto-run classification", () => {
  test("flagged packs are risky (kill-port, docker-clean)", () => {
    expect(isBuiltinRisky(["anything"], getBuiltin("kill-port")!)).toBe(true);
    expect(isBuiltinRisky(["anything"], getBuiltin("docker-clean")!)).toBe(true);
  });

  test("safe packs auto-run when the safety classifier sees nothing", () => {
    const status = getBuiltin("git-status")!;
    expect(isBuiltinRisky(status.variants.any!, status)).toBe(false);
  });

  test("the shared safety classifier still trips risky on dangerous commands", () => {
    expect(isBuiltinRisky(["rm -rf /"])).toBe(true);
  });
});
