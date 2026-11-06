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
  return Object.values(load()).sort((a, b) => b.createdAt - a.createdAt);
}

export function deleteRecipe(name: string): boolean {
  const all = load();
  if (!(name in all)) return false;
  delete all[name];
  save(all);
  return true;
}
