import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "fs";
import os from "os";
import path from "path";

export interface HistoryResult {
  cmd: string;
  exitCode: number;
}

export interface HistoryEntry {
  ts: number;
  task: string;
  ok: boolean;
  /** AI repair rounds used during the task */
  rounds: number;
  results: HistoryResult[];
  snapshotId?: string | null;
}

export function historyFile(): string {
  return (
    process.env.MEERO_HISTORY_FILE ||
    path.join(os.homedir(), ".meero", "history.jsonl")
  );
}

/** Keep the file bounded by size; older entries roll off on rewrite */
const MAX_BYTES = 16_000;
const PRUNE_TO = 200;

export function appendHistory(entry: HistoryEntry): void {
  try {
    const f = historyFile();
    mkdirSync(path.dirname(f), { recursive: true });
    appendFileSync(f, JSON.stringify(entry) + "\n");
    // O(1) stat per append; only reread+rewrite once the file is big
    if (statSync(f).size > MAX_BYTES) {
      const lines = readFileSync(f, "utf-8").split("\n").filter(Boolean);
      if (lines.length > PRUNE_TO)
        writeFileSync(f, lines.slice(-PRUNE_TO).join("\n") + "\n");
    }
  } catch {
    // history must never break a run
  }
}

export function readHistory(limit = 15): HistoryEntry[] {
  const f = historyFile();
  if (!existsSync(f)) return [];
  try {
    const lines = readFileSync(f, "utf-8")
      .split("\n")
      .filter(Boolean);
    const entries: HistoryEntry[] = [];
    for (const line of lines) {
      try {
        const e = JSON.parse(line);
        if (e && typeof e.task === "string" && Array.isArray(e.results)) {
          entries.push(e as HistoryEntry);
        }
      } catch {
        // skip corrupt line
      }
    }
    return entries.slice(-Math.max(0, limit));
  } catch {
    return [];
  }
}

export function clearHistory(): boolean {
  const f = historyFile();
  if (!existsSync(f)) return false;
  try {
    rmSync(f, { force: true });
    return true;
  } catch {
    return false;
  }
}
