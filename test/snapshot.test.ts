import { describe, expect, test } from "bun:test";
import {
  mkdtempSync,
  readFileSync,
  existsSync,
  writeFileSync,
  mkdirSync,
  rmSync,
} from "fs";
import { tmpdir } from "os";
import path from "path";
import {
  createSnapshot,
  extractTargets,
  listSnapshots,
  previewCommands,
  undoSnapshot,
} from "../core/cli/snapshot";

function tempDirs() {
  const project = mkdtempSync(path.join(tmpdir(), "meero-test-proj-"));
  const snaps = mkdtempSync(path.join(tmpdir(), "meero-test-snaps-"));
  return { project, snaps };
}

describe("extractTargets", () => {
  test("picks file arguments of write verbs", () => {
    const { project } = tempDirs();
    writeFileSync(path.join(project, "a.txt"), "x");
    const targets = extractTargets(["rm a.txt"], project);
    expect(targets).toEqual([path.join(project, "a.txt")]);
    rmSync(project, { recursive: true, force: true });
  });

  test("ignores non-existent targets for delete verbs", () => {
    const { project } = tempDirs();
    expect(extractTargets(["rm ghost.txt"], project)).toEqual([]);
    rmSync(project, { recursive: true, force: true });
  });

  test("records redirection targets even when missing (created files)", () => {
    const { project } = tempDirs();
    const targets = extractTargets(["echo hi > new.log"], project);
    expect(targets).toEqual([path.join(project, "new.log")]);
    rmSync(project, { recursive: true, force: true });
  });

  test("read-only verbs never snapshot", () => {
    const { project } = tempDirs();
    writeFileSync(path.join(project, "a.txt"), "x");
    expect(extractTargets(["cat a.txt", "ls -la", "grep foo a.txt"], project)).toEqual([]);
    rmSync(project, { recursive: true, force: true });
  });

  test("skips flags, numbers, and URLs", () => {
    const { project } = tempDirs();
    expect(
      extractTargets(["curl -s https://x.io/f.json --max-time 5"], project),
    ).toEqual([]);
    rmSync(project, { recursive: true, force: true });
  });

  test("handles quoted paths with spaces", () => {
    const { project } = tempDirs();
    writeFileSync(path.join(project, "my file.txt"), "x");
    const targets = extractTargets(['rm "my file.txt"'], project);
    expect(targets).toEqual([path.join(project, "my file.txt")]);
    rmSync(project, { recursive: true, force: true });
  });

  test("expands globs against real files", () => {
    const { project } = tempDirs();
    writeFileSync(path.join(project, "a.tmp"), "1");
    writeFileSync(path.join(project, "b.tmp"), "2");
    writeFileSync(path.join(project, "keep.txt"), "3");
    const targets = extractTargets(["rm *.tmp"], project).sort();
    expect(targets).toEqual([
      path.join(project, "a.tmp"),
      path.join(project, "b.tmp"),
    ]);
    rmSync(project, { recursive: true, force: true });
  });

  test("PowerShell write verbs detected", () => {
    const { project } = tempDirs();
    writeFileSync(path.join(project, "log.txt"), "x");
    const targets = extractTargets(
      ["Remove-Item -Force log.txt", "Set-Content -Path log.txt -Value y"],
      project,
    );
    expect(targets).toEqual([path.join(project, "log.txt")]);
    rmSync(project, { recursive: true, force: true });
  });
});

describe("createSnapshot + undoSnapshot round-trip", () => {
  test("restores deleted files and removes created ones", async () => {
    const { project, snaps } = tempDirs();

    const victim = path.join(project, "victim.txt");
    writeFileSync(victim, "precious data");

    const created = path.join(project, "generated.log");

    const id = await createSnapshot(
      [`rm ${victim}`, `echo junk > ${created}`],
      project,
      snaps,
    );
    expect(id).not.toBeNull();

    // simulate the task actually running
    rmSync(victim);
    writeFileSync(created, "junk");

    const result = undoSnapshot(id ?? undefined, snaps);
    expect(result).not.toBeNull();
    expect(result?.restored).toBe(1);
    expect(result?.removed).toBe(1);

    expect(readFileSync(victim, "utf-8")).toBe("precious data");
    expect(existsSync(created)).toBe(false);

    rmSync(project, { recursive: true, force: true });
    rmSync(snaps, { recursive: true, force: true });
  });

  test("restores overwritten files and directory trees", async () => {
    const { project, snaps } = tempDirs();

    const dir = path.join(project, "src");
    mkdirSync(dir);
    writeFileSync(path.join(dir, "index.ts"), "original");
    const cfg = path.join(project, "config.json");
    writeFileSync(cfg, "{}");

    const id = await createSnapshot(
      [`rm -rf ${dir}`, `echo broken > ${cfg}`],
      project,
      snaps,
    );

    // simulate destructive execution
    rmSync(dir, { recursive: true });
    writeFileSync(cfg, "broken");

    const result = undoSnapshot(id ?? undefined, snaps);
    expect(result?.restored).toBe(2);
    expect(readFileSync(path.join(dir, "index.ts"), "utf-8")).toBe("original");
    expect(readFileSync(cfg, "utf-8")).toBe("{}");

    rmSync(project, { recursive: true, force: true });
    rmSync(snaps, { recursive: true, force: true });
  });

  test("undo with explicit id picks the right snapshot", async () => {
    const { project, snaps } = tempDirs();
    const f1 = path.join(project, "one.txt");
    writeFileSync(f1, "v1");

    const id1 = await createSnapshot([`rm ${f1}`], project, snaps);
    writeFileSync(f1, "v2");
    const id2 = await createSnapshot([`echo x >> ${f1}`], project, snaps);

    rmSync(f1);

    // undo the FIRST snapshot only → get v1 back
    const r = undoSnapshot(id1 ?? undefined, snaps);
    expect(readFileSync(f1, "utf-8")).toBe("v1");
    expect(r?.restored).toBe(1);

    rmSync(project, { recursive: true, force: true });
    rmSync(snaps, { recursive: true, force: true });
  });

  test("nothing to snapshot → null id, no crash on undo", async () => {
    const { project, snaps } = tempDirs();
    const id = await createSnapshot(["ls -la"], project, snaps);
    expect(id).toBeNull();
    expect(undoSnapshot(undefined, snaps)).toBeNull();
    rmSync(project, { recursive: true, force: true });
    rmSync(snaps, { recursive: true, force: true });
  });

  test("listSnapshots returns newest first", async () => {
    const { project, snaps } = tempDirs();
    const f = path.join(project, "x.txt");
    writeFileSync(f, "1");
    await createSnapshot([`rm ${f}`], project, snaps);
    writeFileSync(f, "2");
    await new Promise((r) => setTimeout(r, 5));
    const id2 = await createSnapshot([`echo y > ${path.join(project, "y.txt")}`], project, snaps);

    const list = listSnapshots(snaps);
    expect(list.length).toBe(2);
    expect(list[0]?.id).toBe(id2 ?? undefined);

    rmSync(project, { recursive: true, force: true });
    rmSync(snaps, { recursive: true, force: true });
  });
});

describe("previewCommands", () => {
  test("lists exact files a delete will remove", () => {
    const { project } = tempDirs();
    const f = path.join(project, "doomed.txt");
    writeFileSync(f, "abc");
    const lines = previewCommands([`rm ${f}`], project);
    expect(lines.some((l) => l.includes("delete:") && l.includes("doomed.txt"))).toBe(true);
    rmSync(project, { recursive: true, force: true });
  });

  test("glob expansion shows the matched blast radius", () => {
    const { project } = tempDirs();
    writeFileSync(path.join(project, "a.tmp"), "1");
    writeFileSync(path.join(project, "b.tmp"), "2");
    const lines = previewCommands(["rm *.tmp"], project);
    expect(lines.filter((l) => l.includes("delete:")).length).toBe(2);
    rmSync(project, { recursive: true, force: true });
  });

  test("overwrite vs create for redirections", () => {
    const { project } = tempDirs();
    const existing = path.join(project, "cfg.json");
    writeFileSync(existing, "{}");
    const lines = previewCommands(
      [`echo x > ${existing}`, `echo y > ${path.join(project, "new.log")}`],
      project,
    );
    expect(lines.some((l) => l.includes("overwrite:") && l.includes("cfg.json"))).toBe(true);
    expect(lines.some((l) => l.includes("create:") && l.includes("new.log"))).toBe(true);
    rmSync(project, { recursive: true, force: true });
  });

  test("append redirection detected", () => {
    const { project } = tempDirs();
    const log = path.join(project, "app.log");
    writeFileSync(log, "old");
    const lines = previewCommands([`echo x >> ${log}`], project);
    expect(lines.some((l) => l.includes("append to:"))).toBe(true);
    rmSync(project, { recursive: true, force: true });
  });

  test("in-place modification detected (sed)", () => {
    const { project } = tempDirs();
    writeFileSync(path.join(project, "code.ts"), "x");
    const lines = previewCommands(["sed -i s/a/b/ code.ts"], project);
    expect(lines.some((l) => l.includes("modify in place:"))).toBe(true);
    rmSync(project, { recursive: true, force: true });
  });

  test("mv shows move line", () => {
    const { project } = tempDirs();
    writeFileSync(path.join(project, "src.txt"), "x");
    const lines = previewCommands([`mv src.txt ${path.join(project, "dst.txt")}`], project);
    expect(lines.some((l) => l.includes("move:"))).toBe(true);
    rmSync(project, { recursive: true, force: true });
  });

  test("read-only commands produce no preview noise", () => {
    const { project } = tempDirs();
    writeFileSync(path.join(project, "a.txt"), "x");
    expect(previewCommands(["ls -la", "cat a.txt", "echo hi"], project)).toEqual([]);
    rmSync(project, { recursive: true, force: true });
  });

  test("PowerShell Remove-Item previewed as delete", () => {
    const { project } = tempDirs();
    writeFileSync(path.join(project, "x.txt"), "data");
    const lines = previewCommands(
      [`Remove-Item -Force ${path.join(project, "x.txt")}`],
      project,
    );
    expect(lines.some((l) => l.includes("delete:") && l.includes("x.txt"))).toBe(true);
    rmSync(project, { recursive: true, force: true });
  });

  test("directory deletion reports file count and size", () => {
    const { project } = tempDirs();
    const dir = path.join(project, "bigdir");
    mkdirSync(dir);
    writeFileSync(path.join(dir, "1.txt"), "aaa");
    writeFileSync(path.join(dir, "2.txt"), "bbb");
    const lines = previewCommands([`rm -r ${dir}`], project);
    const del = lines.find((l) => l.includes("delete:") && l.includes("bigdir"));
    expect(del).toBeDefined();
    expect(del).toContain("2 files");
    rmSync(project, { recursive: true, force: true });
  });

  test("git push --force flags FORCE even outside a repo", () => {
    const { project } = tempDirs();
    const lines = previewCommands(["git push --force origin main"], project);
    expect(lines.some((l) => l.includes("FORCE"))).toBe(true);
    rmSync(project, { recursive: true, force: true });
  });
});
