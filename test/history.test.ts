import { expect, test, describe, afterAll } from "bun:test";
import { appendFileSync, mkdtempSync, readFileSync, rmSync } from "fs";
import os from "os";
import path from "path";
import { appendHistory, clearHistory, historyFile, readHistory } from "../core/cli/history";

const tmp = mkdtempSync(path.join(os.tmpdir(), "meero-hist-"));
process.env.MEERO_HISTORY_FILE = path.join(tmp, "history.jsonl");

function entry(task: string, ok = true, rounds = 0) {
  return {
    ts: Date.now(),
    task,
    ok,
    rounds,
    results: [{ cmd: `echo ${task}`, exitCode: ok ? 0 : 1 }],
    snapshotId: null,
  };
}

describe("history", () => {
  test("append + read round-trip", () => {
    appendHistory(entry("alpha"));
    const list = readHistory(5);
    expect(list.length).toBe(1);
    expect(list[0]?.task).toBe("alpha");
    expect(list[0]?.ok).toBe(true);
  });

  test("readHistory respects limit (newest kept)", () => {
    appendHistory(entry("beta"));
    appendHistory(entry("gamma", false, 2));
    const last2 = readHistory(2);
    expect(last2.map((e) => e.task)).toEqual(["beta", "gamma"]);
    expect(last2[1]?.rounds).toBe(2);
  });

  test("corrupt lines are skipped, not fatal", () => {
    appendFileSync(historyFile(), "this is not json\n");
    appendHistory(entry("delta"));
    const list = readHistory(10);
    expect(list.map((e) => e.task)).toEqual([
      "alpha",
      "beta",
      "gamma",
      "delta",
    ]);
  });

  test("clear removes the file and reports it", () => {
    expect(clearHistory()).toBe(true);
    expect(readHistory(5)).toEqual([]);
    expect(clearHistory()).toBe(false); // already gone
  });

  test("prune keeps file bounded once the size trigger fires", () => {
    for (let i = 0; i < 250; i++) appendHistory(entry(`p${i}`));
    const lines = readFileSync(historyFile(), "utf-8")
      .split("\n")
      .filter(Boolean);
    expect(lines.length).toBeLessThanOrEqual(220);
    const newest = readHistory(1);
    expect(newest[0]?.task).toBe("p249");
  });

  afterAll(() => rmSync(tmp, { recursive: true, force: true }));
});
