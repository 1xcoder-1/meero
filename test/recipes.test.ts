import { expect, test, describe, afterAll } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import os from "os";
import path from "path";
import {
  deleteRecipe,
  exportRecipes,
  exportRecipesToFile,
  getRecipe,
  importBundle,
  importRecipesFromFile,
  listRecipes,
  saveRecipe,
} from "../core/cli/recipes";

const tmp = mkdtempSync(path.join(os.tmpdir(), "meero-recipes-"));
process.env.MEERO_RECIPES_FILE = path.join(tmp, "recipes.json");

describe("recipes", () => {
  test("save + get round-trip", () => {
    saveRecipe("clean-build", "clean and rebuild", ["rm -rf dist", "npm run build"]);
    const r = getRecipe("clean-build");
    expect(r?.task).toBe("clean and rebuild");
    expect(r?.commands).toEqual(["rm -rf dist", "npm run build"]);
    expect(r?.createdAt).toBeGreaterThan(0);
  });

  test("missing recipe returns null", () => {
    expect(getRecipe("nope")).toBeNull();
  });

  test("list is newest-first", () => {
    saveRecipe("second", "t2", ["echo 2"]);
    const names = listRecipes().map((r) => r.name);
    expect(names[0]).toBe("second");
    expect(names).toContain("clean-build");
  });

  test("identical createdAt falls back to insertion order (Linux CI tie-break)", () => {
    const f = path.join(tmp, "recipes.json");
    const backup = readFileSync(f, "utf-8");
    const t = 1_700_000_000_000;
    writeFileSync(
      f,
      JSON.stringify({
        older: { name: "older", task: "a", commands: ["echo a"], createdAt: t },
        newer: { name: "newer", task: "b", commands: ["echo b"], createdAt: t },
      }),
    );
    expect(listRecipes().map((r) => r.name)).toEqual(["newer", "older"]);
    writeFileSync(f, backup); // keep the shared file baseline for later tests
  });

  test("overwrite by same name", () => {
    saveRecipe("second", "t2 v2", ["echo 3"]);
    expect(getRecipe("second")?.commands).toEqual(["echo 3"]);
    expect(listRecipes().length).toBe(2);
  });

  test("delete works and reports", () => {
    expect(deleteRecipe("second")).toBe(true);
    expect(deleteRecipe("second")).toBe(false);
    expect(listRecipes().length).toBe(1);
  });

  test("corrupt entries are ignored, not fatal", () => {
    writeFileSync(path.join(tmp, "recipes.json"), '{"x": 5, "y": {"name": "y", "commands": ["ls"], "createdAt": 1, "task": "t"}}');
    expect(listRecipes().map((r) => r.name)).toEqual(["y"]);
  });

  describe("export / import", () => {
    const bundleFile = path.join(tmp, "shared.json");

    test("export all produces a versioned bundle", () => {
      saveRecipe("deploy", "deploy app", ["npm run build", "npm run start"]);
      const { bundle, missing } = exportRecipes(null);
      expect(missing).toEqual([]);
      expect(bundle.format).toBe("meero-recipes");
      expect(bundle.version).toBe(1);
      expect(bundle.recipes.map((r) => r.name)).toContain("deploy");
    });

    test("export named recipes reports missing ones", () => {
      const { bundle, missing } = exportRecipes(["deploy", "ghost"]);
      expect(bundle.recipes.map((r) => r.name)).toEqual(["deploy"]);
      expect(missing).toEqual(["ghost"]);
    });

    test("round-trip: export to file, wipe store, import back", () => {
      exportRecipesToFile(bundleFile, ["deploy"]);
      const exported = JSON.parse(readFileSync(bundleFile, "utf-8"));
      expect(exported.recipes.length).toBe(1);

      deleteRecipe("deploy");
      expect(getRecipe("deploy")).toBeNull();

      const res = importRecipesFromFile(bundleFile);
      expect(res.imported).toEqual(["deploy"]);
      expect(getRecipe("deploy")?.commands).toEqual(["npm run build", "npm run start"]);
    });

    test("import skips existing names unless --force", () => {
      const res = importBundle(
        { format: "meero-recipes", version: 1, exportedAt: 0, recipes: [{ name: "deploy", task: "new task", commands: ["changed"], createdAt: 1 }] },
      );
      expect(res.skipped).toEqual(["deploy"]);
      expect(getRecipe("deploy")?.commands).toEqual(["npm run build", "npm run start"]);

      const forced = importBundle(
        { format: "meero-recipes", version: 1, exportedAt: 0, recipes: [{ name: "deploy", task: "new task", commands: ["changed"], createdAt: 1 }] },
        true,
      );
      expect(forced.imported).toEqual(["deploy"]);
      expect(getRecipe("deploy")?.commands).toEqual(["changed"]);
    });

    test("raw recipes.json map is also importable", () => {
      const res = importBundle({ quick: { name: "quick", task: "t", commands: ["echo q"], createdAt: 5 } });
      expect(res.imported).toEqual(["quick"]);
      expect(getRecipe("quick")).not.toBeNull();
    });

    test("invalid entries counted, garbage shape throws", () => {
      const res = importBundle({ recipes: [{ name: "bad" }, { name: "ok", commands: ["ls"], task: "", createdAt: 1 }] });
      expect(res.invalid).toBe(1);
      expect(res.imported).toEqual(["ok"]);
      expect(() => importBundle("just a string")).toThrow(/not a meero recipe file/);
      expect(() => importBundle([1, 2])).toThrow(/not a meero recipe file/);
    });

    test("empty export does not clobber an existing bundle file", () => {
      writeFileSync(bundleFile, '{"format":"meero-recipes","version":1,"recipes":[{"name":"keep","commands":["ls"],"task":"","createdAt":1}]}');
      const { count } = exportRecipesToFile(bundleFile, ["does-not-exist"]);
      expect(count).toBe(0);
      expect(readFileSync(bundleFile, "utf-8")).toContain("keep");
      rmSync(bundleFile, { force: true });
      expect(existsSync(bundleFile)).toBe(false); // still untouched, not created
    });
  });

  afterAll(() => rmSync(tmp, { recursive: true, force: true }));
});
