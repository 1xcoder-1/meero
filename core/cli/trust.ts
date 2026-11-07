import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import path from "path";
import { select } from "@inquirer/prompts";

export type TrustLevel = "low" | "med" | "high";

export const TRUST_LEVELS: TrustLevel[] = ["low", "med", "high"];

export function isTrustLevel(v: unknown): v is TrustLevel {
  return typeof v === "string" && (TRUST_LEVELS as string[]).includes(v);
}

interface TrustConfig {
  global: TrustLevel;
  dirs: Record<string, TrustLevel>;
}

export function trustFile(): string {
  return (
    process.env.MEERO_TRUST_FILE ||
    path.join(homedir(), ".meero", "trust.json")
  );
}

function load(): TrustConfig {
  try {
    if (!existsSync(trustFile())) return { global: "med", dirs: {} };
    const raw = JSON.parse(readFileSync(trustFile(), "utf-8"));
    const dirs: Record<string, TrustLevel> = {};
    if (raw.dirs && typeof raw.dirs === "object") {
      for (const [k, v] of Object.entries(raw.dirs))
        if (isTrustLevel(v)) dirs[k] = v;
    }
    return {
      global: isTrustLevel(raw.global) ? raw.global : "med",
      dirs,
    };
  } catch {
    return { global: "med", dirs: {} };
  }
}

function save(cfg: TrustConfig): void {
  const f = trustFile();
  mkdirSync(path.dirname(f), { recursive: true });
  writeFileSync(f, JSON.stringify(cfg, null, 2));
}

const norm = (p: string) => path.resolve(p).toLowerCase().replace(/[\\/]+$/, "");

/**
 * Resolution order: explicit CLI --trust > longest matching dir entry >
 * global default > "med".
 */
export function resolveTrust(
  cliFlag?: string,
  cwd = process.cwd(),
): TrustLevel {
  if (isTrustLevel(cliFlag)) return cliFlag;
  const cfg = load();
  const here = norm(cwd);
  let best: { prefix: string; level: TrustLevel } | null = null;
  for (const [dir, level] of Object.entries(cfg.dirs)) {
    const d = norm(dir);
    if ((here === d || here.startsWith(d + path.sep)) && (!best || d.length > best.prefix.length))
      best = { prefix: d, level };
  }
  return best?.level ?? cfg.global;
}

export function setTrust(level: TrustLevel, cwd?: string): void {
  const cfg = load();
  if (cwd) cfg.dirs[norm(cwd)] = level;
  else cfg.global = level;
  save(cfg);
}

export function showTrust(cwd = process.cwd()): {
  effective: TrustLevel;
  scope: "cli" | "dir" | "global";
} {
  const cfg = load();
  const here = norm(cwd);
  for (const [dir, level] of Object.entries(cfg.dirs)) {
    const d = norm(dir);
    if (here === d || here.startsWith(d + path.sep))
      return { effective: level, scope: "dir" };
  }
  return { effective: cfg.global, scope: "global" };
}

/**
 * Pre-execution confirmation at a trust level (used by recipe runs and
 * pre-built packs). `low` adds PER-COMMAND confirmation inside runTask —
 * the task level still gets this single gate.
 */
export async function confirmExecution(
  commands: string[],
  level: TrustLevel,
): Promise<boolean> {
  if (level === "high") return true; // danger gate stays armed regardless
  if (commands.length === 0) return false;

  const ok = await select({
    message: "Execute these commands?",
    choices: [
      { name: "Yes", value: 1 },
      { name: "No", value: 0 },
    ],
  });
  return ok === 1;
}

/** Per-command confirm for trust=low; false = skip, "abort" = stop task */
export async function confirmEach(cmd: string): Promise<boolean | "abort"> {
  const go = await select({
    message: `Run this command?\n  ${cmd.slice(0, 90)}`,
    choices: [
      { name: "Yes", value: 1 },
      { name: "No — skip it", value: 0 },
      { name: "Abort whole task", value: -1 },
    ],
  });
  if (go === -1) return "abort";
  return go === 1;
}
