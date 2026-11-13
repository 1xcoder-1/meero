import { execFileSync } from "child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "fs";
import { homedir } from "os";
import path from "path";

/**
 * meero undo — trash-snapshot safety net.
 *
 * Before commands execute, every file/directory they touch is copied into
 * ~/.meero/snapshots/<id>/files/<n>/. The manifest records whether the path
 * existed before the run:
 *   existed  → undo copies it back
 *   missing  → undo deletes it (the command created it)
 */

export interface SnapshotEntry {
  original: string; // absolute path on disk
  existed: boolean; // did it exist before the task ran?
  type: "file" | "dir";
  stored: string; // path inside the snapshot (relative to snapshot dir)
}

export interface SnapshotManifest {
  id: string;
  ts: number;
  cwd: string;
  commands: string[];
  entries: SnapshotEntry[];
}

const MAX_KEEP = 20;

export function snapshotDir(): string {
  return (
    process.env.MEERO_SNAPSHOT_DIR || path.join(homedir(), ".meero", "snapshots")
  );
}

/** Verbs that modify/delete/create filesystem state (undo must snapshot these) */
const WRITE_VERBS = new Set([
  "rm",
  "rmdir",
  "del",
  "erase",
  "rd",
  "mv",
  "move",
  "cp",
  "copy",
  "sed",
  "tee",
  "truncate",
  "touch",
  "mkdir",
  "remove-item",
  "ri",
  "move-item",
  "mi",
  "copy-item",
  "ci",
  "rename-item",
  "rni",
  "set-content",
  "sc",
  "add-content",
  "ac",
  "clear-content",
  "out-file",
  "new-item",
  "ni",
]);

/** Verbs that never need a snapshot even if they mention paths */
const READONLY_STARTS = new Set([
  "ls",
  "dir",
  "cat",
  "type",
  "grep",
  "findstr",
  "find",
  "echo",
  "which",
  "where",
  "head",
  "tail",
  "wc",
  "du",
  "df",
  "stat",
  "file",
  "get-childitem",
  "get-content",
  "get-item",
  "select-string",
  "test-path",
]);

function looksLikePath(token: string): boolean {
  if (!token || token.startsWith("-") || token.startsWith("'")) return false;
  if (/^[&|<>=();]/.test(token)) return false;
  if (/^\d+$/.test(token)) return false;
  if (/^[a-z]+:\/\//i.test(token)) return false; // URL
  if (token.includes("://")) return false;
  if (token.startsWith("$") || token.startsWith("${")) return false; // vars
  if (token === "." || token === ".." || token === "*") return false;
  // has a separator, a glob, or a file extension
  return /[/\\*]/.test(token) || /\.\w{1,10}$/.test(token);
}

function expandGlob(token: string, cwd: string): string[] {
  if (!/[*?]/.test(token)) {
    return [path.resolve(cwd, token)];
  }
  try {
    const g = new Bun.Glob(token);
    const matches: string[] = [];
    for (const m of g.scanSync({ cwd, onlyFiles: false, dot: true })) {
      matches.push(path.resolve(cwd, m));
    }
    return matches;
  } catch {
    return [];
  }
}

interface ParsedCommand {
  verb: string;
  args: string[];
  redirect: { token: string; append: boolean }[];
}

/** Shared tokenizer for snapshot extraction + dry-run preview */
function parseCommand(cmd: string): ParsedCommand {
  const tokens = cmd.match(/"[^"]*"|'[^']*'|\S+/g)?.map((t) =>
    t.replace(/^["']|["']$/g, ""),
  );
  const empty: ParsedCommand = { verb: "", args: [], redirect: [] };
  if (!tokens || tokens.length === 0) return empty;

  let verb = (tokens[0] ?? "").toLowerCase().replace(/\.exe$/, "");
  let i = 1;
  if (verb === "sudo" || verb === "&") {
    verb = (tokens[1] ?? "").toLowerCase().replace(/\.exe$/, "");
    i = 2;
  }

  const args: string[] = [];
  const redirect: { token: string; append: boolean }[] = [];
  let afterRedirect = false;
  let appendMode = false;
  for (; i < tokens.length; i++) {
    const t = tokens[i] ?? "";
    if (!t) continue;
    if (t === ">" || t === ">>" || t === "1>") {
      appendMode = t === ">>";
      afterRedirect = true;
      continue;
    }
    if (afterRedirect) {
      redirect.push({ token: t, append: appendMode });
      afterRedirect = false;
      continue;
    }
    args.push(t);
  }
  return { verb, args, redirect };
}

/**
 * Extract filesystem targets a set of commands will modify/delete/create.
 * Deliberately conservative: only known write verbs, real paths, never
 * whole drive/system roots.
 */
export function extractTargets(
  commands: string[],
  cwd = process.cwd(),
): string[] {
  const found = new Set<string>();

  for (const cmd of commands) {
    const { verb, args, redirect } = parseCommand(cmd);

    // `> file` targets are write endpoints no matter the verb
    for (const r of redirect) {
      if (!looksLikePath(r.token)) continue;
      for (const p of expandGlob(r.token, cwd)) {
        if (!isRootish(p)) found.add(p);
      }
    }

    if (READONLY_STARTS.has(verb) || !WRITE_VERBS.has(verb)) continue;
    // Creation verbs (touch/mkdir/new-item) target files that do not exist
    // yet — they must be registered so `meero undo` can delete them.
    const CREATION_VERBS = new Set(["touch", "mkdir", "new-item", "ni"]);
    for (const t of args) {
      if (!looksLikePath(t)) continue;
      for (const p of expandGlob(t, cwd)) {
        if (isRootish(p)) continue;
        if (existsSync(p) || CREATION_VERBS.has(verb)) found.add(p);
      }
    }
  }

  return [...found];
}

function isRootish(p: string): boolean {
  const norm = path.normalize(p);
  if (/^([a-z]:\\?|\/)$/i.test(norm)) return true; // C:\ or /
  const parent = path.dirname(norm);
  return parent === norm; // reached the root of this tree
}

function newId(): string {
  return (
    Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6)
  );
}

/**
 * Snapshot every target of the upcoming commands.
 * Returns the snapshot id, or null when nothing needed snapshotting.
 */
export async function createSnapshot(
  commands: string[],
  cwd = process.cwd(),
  dir = snapshotDir(),
): Promise<string | null> {
  const targets = extractTargets(commands, cwd);
  if (targets.length === 0) return null;

  const id = newId();
  const snapPath = path.join(dir, id);
  const filesPath = path.join(snapPath, "files");
  mkdirSync(filesPath, { recursive: true });

  const entries: SnapshotEntry[] = [];
  let idx = 0;

  for (const original of targets) {
    const exists = existsSync(original);
    if (!exists) {
      entries.push({
        original,
        existed: false,
        type: "file",
        stored: "",
      });
      continue;
    }

    const type = statSync(original).isDirectory() ? "dir" : "file";
    const stored = path.join(String(idx), path.basename(original));
    cpSync(original, path.join(filesPath, stored), { recursive: true });
    entries.push({ original, existed: true, type, stored });
    idx++;
  }

  const manifest: SnapshotManifest = {
    id,
    ts: Date.now(),
    cwd,
    commands,
    entries,
  };
  writeFileSync(
    path.join(snapPath, "manifest.json"),
    JSON.stringify(manifest, null, 2),
  );

  pruneSnapshots(dir);
  return id;
}

export function listSnapshots(
  dir = snapshotDir(),
): SnapshotManifest[] {
  if (!existsSync(dir)) return [];
  const out: SnapshotManifest[] = [];
  for (const name of readdirSync(dir)) {
    try {
      const raw = readFileSync(path.join(dir, name, "manifest.json"), "utf-8");
      out.push(JSON.parse(raw));
    } catch {
      // corrupt/incomplete snapshot — ignore it
    }
  }
  return out.sort((a, b) => b.ts - a.ts);
}

export interface UndoResult {
  id: string;
  restored: number;
  removed: number;
  skipped: number;
}

/**
 * Revert a snapshot (default: most recent). Files that existed are copied
 * back; files that did not exist before (were created) are deleted.
 */
export function undoSnapshot(
  id?: string,
  dir = snapshotDir(),
): UndoResult | null {
  const snaps = listSnapshots(dir);
  if (snaps.length === 0) return null;

  const snap = id ? snaps.find((s) => s.id === id) : snaps[0];
  if (!snap) return null;

  let restored = 0;
  let removed = 0;
  let skipped = 0;

  for (const entry of snap.entries) {
    if (entry.existed) {
      const from = path.join(dir, snap.id, "files", entry.stored);
      if (!existsSync(from)) {
        skipped++;
        continue;
      }
      try {
        mkdirSync(path.dirname(entry.original), { recursive: true });
        if (existsSync(entry.original)) {
          rmSync(entry.original, { recursive: true, force: true });
        }
        cpSync(from, entry.original, { recursive: true });
        restored++;
      } catch {
        skipped++;
      }
    } else {
      try {
        if (existsSync(entry.original)) {
          rmSync(entry.original, { recursive: true, force: true });
          removed++;
        }
      } catch {
        skipped++;
      }
    }
  }

  return { id: snap.id, restored, removed, skipped };
}

function pruneSnapshots(dir = snapshotDir()) {
  try {
    const snaps = listSnapshots(dir);
    for (const old of snaps.slice(MAX_KEEP)) {
      rmSync(path.join(dir, old.id), { recursive: true, force: true });
    }
  } catch {
    // pruning must never break execution
  }
}

/* ------------------------------------------------------------------ */
/* DRY-RUN PREVIEW: concrete "what will actually change" for a command */
/* ------------------------------------------------------------------ */

const DELETE_VERBS = new Set([
  "rm",
  "del",
  "erase",
  "rd",
  "rmdir",
  "remove-item",
  "ri",
]);
const MOVE_VERBS = new Set([
  "mv",
  "move",
  "ren",
  "rename",
  "move-item",
  "mi",
  "rename-item",
  "rni",
]);
const COPY_VERBS = new Set(["cp", "copy", "copy-item", "ci"]);
const MODIFY_VERBS = new Set([
  "sed",
  "tee",
  "truncate",
  "set-content",
  "sc",
  "add-content",
  "ac",
  "clear-content",
  "out-file",
]);

function sizeBytes(p: string): number {
  try {
    return statSync(p).size;
  } catch {
    return 0;
  }
}

function humanSize(bytes: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "unit",
    unit: "byte",
    unitDisplay: "short",
    notation: "compact",
  }).format(bytes);
}

function measureTree(root: string, cap = 5000): { bytes: number; files: number } {
  let bytes = 0;
  let files = 0;
  const stack = [root];
  while (stack.length > 0 && files < cap) {
    const cur = stack.pop()!;
    let st;
    try {
      st = statSync(cur);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      try {
        for (const e of readdirSync(cur)) stack.push(path.join(cur, e));
      } catch {}
    } else {
      bytes += st.size;
      files++;
    }
  }
  return { bytes, files };
}

function describeTargets(action: string, targets: string[]): string[] {
  const lines: string[] = [];
  for (const p of targets) {
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      const m = measureTree(p);
      lines.push(`  ${action}: ${p}  (${m.files} files, ${humanSize(m.bytes)})`);
    } else {
      lines.push(`  ${action}: ${p}  (${humanSize(st.size)})`);
    }
  }
  if (lines.length > 12)
    return [...lines.slice(0, 12), `  … and ${lines.length - 12} more`];
  return lines;
}

function gitPushPreview(cmd: string, cwd: string): string[] {
  const lower = cmd.toLowerCase();
  const force = /--force(?!-with-lease)|\s-f(\s|$)/.test(lower);
  const head = `  git push${force ? " — FORCE (rewrites remote history!)" : ""} would send:`;
  try {
    const out = execFileSync(
      "git",
      ["log", "--oneline", "-n", "10", "@{u}..HEAD"],
      { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
    ).trim();
    if (!out) return [head.replace(" would send:", ": nothing ahead of upstream")];
    return [head, ...out.split("\n").map((l) => `    ${l}`)];
  } catch {
    return [head.replace(" would send:", " — could not read upstream commits")];
  }
}

function previewOne(cmd: string, cwd: string): string[] {
  const { verb, args, redirect } = parseCommand(cmd);
  const out: string[] = [];

  if (verb === "git" && args[0] === "push") return gitPushPreview(cmd, cwd);

  const pathTargets = () =>
    args
      .filter(looksLikePath)
      .flatMap((t) => expandGlob(t, cwd))
      .filter((p) => !isRootish(p));

  if (DELETE_VERBS.has(verb)) {
    out.push(...describeTargets("delete", pathTargets().filter(existsSync)));
  } else if (MOVE_VERBS.has(verb)) {
    out.push(
      ...pathTargets()
        .filter(existsSync)
        .map((p) => `  move: ${p}  (original restorable via meero undo)`),
    );
  } else if (COPY_VERBS.has(verb)) {
    const ps = args.filter(looksLikePath).map((t) => path.resolve(cwd, t));
    const dest = ps[ps.length - 1];
    if (dest && existsSync(dest) && statSync(dest).isFile())
      out.push(`  overwrite: ${dest}  (${humanSize(sizeBytes(dest))})`);
  } else if (MODIFY_VERBS.has(verb)) {
    out.push(
      ...describeTargets(
        "modify in place",
        pathTargets().filter((p) => existsSync(p) && statSync(p).isFile()),
      ),
    );
  }

  for (const r of redirect) {
    if (!looksLikePath(r.token)) continue;
    const p = path.resolve(cwd, r.token);
    if (isRootish(p)) continue;
    if (existsSync(p))
      out.push(
        `  ${r.append ? "append to" : "overwrite"}: ${p}  (${humanSize(sizeBytes(p))})`,
      );
    else out.push(`  create: ${p}`);
  }
  return out;
}

/**
 * Human-readable dry-run preview: which real files each command will
 * delete / overwrite / create / modify, with sizes. Used by the safety
 * gate so the user sees the concrete blast radius before typing confirm.
 */
export function previewCommands(
  commands: string[],
  cwd = process.cwd(),
): string[] {
  const lines: string[] = [];
  for (const cmd of commands) lines.push(...previewOne(cmd, cwd));
  return lines;
}
