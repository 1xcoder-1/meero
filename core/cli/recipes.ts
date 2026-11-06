import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import path from "path";

export interface Recipe {
  name: string;
  task: string;
  commands: string[];
  createdAt: number;
}

export function recipesFile(): string {
  return (
    process.env.MEERO_RECIPES_FILE ||
    path.join(homedir(), ".meero", "recipes.json")
  );
}

function load(): Record<string, Recipe> {
  try {
    if (!existsSync(recipesFile())) return {};
    const raw = JSON.parse(readFileSync(recipesFile(), "utf-8"));
    if (!raw || typeof raw !== "object") return {};
    const out: Record<string, Recipe> = {};
    for (const [k, v] of Object.entries(raw)) {
      const r = v as Recipe;
      if (r && Array.isArray(r.commands) && typeof r.name === "string")
        out[k] = r;
    }
    return out;
  } catch {
    return {};
  }
}

function save(all: Record<string, Recipe>): void {
  const f = recipesFile();
  mkdirSync(path.dirname(f), { recursive: true });
  writeFileSync(f, JSON.stringify(all, null, 2));
}

export function saveRecipe(
  name: string,
  task: string,
  commands: string[],
): Recipe {
  const all = load();
  const recipe: Recipe = { name, task, commands, createdAt: Date.now() };
  all[name] = recipe;
  save(all);
  return recipe;
}

export function getRecipe(name: string): Recipe | null {
  return load()[name] ?? null;
}

export function listRecipes(): Recipe[] {
  // Newest-first. createdAt ties happen on fast machines (same millisecond on
  // Linux CI), so fall back to insertion order — later-stored recipe wins.
  return Object.values(load())
    .map((recipe, i) => ({ recipe, i }))
    .sort((a, b) => b.recipe.createdAt - a.recipe.createdAt || b.i - a.i)
    .map(({ recipe }) => recipe);
}

export function deleteRecipe(name: string): boolean {
  const all = load();
  if (!(name in all)) return false;
  delete all[name];
  save(all);
  return true;
}

/** Shareable bundle: `meero recipe export` writes this, `import` reads it back */
export interface RecipeBundle {
  format: "meero-recipes";
  version: 1;
  exportedAt: number;
  recipes: Recipe[];
}

export interface ImportResult {
  imported: string[];
  skipped: string[];
  invalid: number;
}

/** Validation for recipes arriving from an external file */
function sanitizeRecipe(v: unknown): Recipe | null {
  const r = v as Recipe;
  if (!r || typeof r.name !== "string" || !r.name.trim() || !Array.isArray(r.commands))
    return null;
  return {
    name: r.name,
    task: typeof r.task === "string" ? r.task : "",
    commands: r.commands.map(String),
    createdAt: typeof r.createdAt === "number" ? r.createdAt : Date.now(),
  };
}

export function exportRecipes(
  names: string[] | null,
): { bundle: RecipeBundle; missing: string[] } {
  const all = load();
  const missing: string[] = [];
  let items: Recipe[];
  if (names && names.length > 0) {
    items = [];
    for (const n of names) {
      if (all[n]) items.push(all[n]);
      else missing.push(n);
    }
  } else {
    items = listRecipes();
  }
  return {
    bundle: { format: "meero-recipes", version: 1, exportedAt: Date.now(), recipes: items },
    missing,
  };
}

/** Merge a bundle (or a raw recipes.json map) into the local store */
export function importBundle(data: unknown, force = false): ImportResult {
  let candidates: unknown[];
  const b = data as RecipeBundle;
  if (b && Array.isArray(b.recipes)) candidates = b.recipes;
  else if (data && typeof data === "object" && !Array.isArray(data))
    candidates = Object.values(data);
  else throw new Error("not a meero recipe file (expected a JSON object)");

  const all = load();
  const result: ImportResult = { imported: [], skipped: [], invalid: 0 };
  for (const v of candidates) {
    const r = sanitizeRecipe(v);
    if (!r) {
      result.invalid++;
      continue;
    }
    if (all[r.name] && !force) {
      result.skipped.push(r.name);
      continue;
    }
    all[r.name] = r;
    result.imported.push(r.name);
  }
  save(all);
  return result;
}

/** CLI-facing wrappers: write/read a shareable bundle on disk */
export function exportRecipesToFile(
  file: string,
  names: string[] | null,
): { count: number; missing: string[] } {
  const { bundle, missing } = exportRecipes(names);
  // An empty export would only clobber a previous, real bundle — skip the write
  if (bundle.recipes.length > 0) writeFileSync(file, JSON.stringify(bundle, null, 2));
  return { count: bundle.recipes.length, missing };
}

export function importRecipesFromFile(file: string, force = false): ImportResult {
  return importBundle(JSON.parse(readFileSync(file, "utf-8")), force);
}
