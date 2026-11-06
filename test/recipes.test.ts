import { expect, test, describe, afterAll } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import os from "os";
import path from "path";
import {
  deleteRecipe,
  getRecipe,
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

  afterAll(() => rmSync(tmp, { recursive: true, force: true }));
});
