import { expect, test, describe, afterAll } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import os from "os";
import path from "path";
import {
  isTrustLevel,
  resolveTrust,
  setTrust,
  showTrust,
  trustFile,
} from "../core/cli/trust";

const tmp = mkdtempSync(path.join(os.tmpdir(), "meero-trust-"));
process.env.MEERO_TRUST_FILE = path.join(tmp, "trust.json");

describe("trust", () => {
  test("defaults to med with no config file", () => {
    expect(resolveTrust(undefined, tmp)).toBe("med");
  });

  test("cli flag wins over everything", () => {
    expect(resolveTrust("low", tmp)).toBe("low");
    expect(resolveTrust("HIGH", tmp)).toBe("med"); // case-sensitive = invalid → fallthrough
    expect(resolveTrust("bogus", tmp)).toBe("med");
  });

  test("isTrustLevel validation", () => {
    expect(isTrustLevel("low")).toBe(true);
    expect(isTrustLevel("med")).toBe(true);
    expect(isTrustLevel("high")).toBe(true);
    expect(isTrustLevel("yolo")).toBe(false);
    expect(isTrustLevel(undefined)).toBe(false);
  });

  test("global setting persists and resolves", () => {
    setTrust("high");
    expect(resolveTrust(undefined, tmp)).toBe("high");
    expect(showTrust(tmp)).toEqual({ effective: "high", scope: "global" });
  });

  test("per-dir entry beats global for subdirectories", () => {
    const project = path.join(tmp, "repo", "sub");
    mkdtempSync(path.join(tmp, "x")); // ensure tmp alive; also harmless
    writeFileSync(path.join(tmp, "keep"), "");
    setTrust("low", path.join(tmp, "repo"));
    expect(resolveTrust(undefined, project)).toBe("low"); // longest-prefix dir
    expect(resolveTrust(undefined, path.join(tmp, "other"))).toBe("high");
    expect(showTrust(project)).toEqual({ effective: "low", scope: "dir" });
  });

  test("corrupt config falls back to med", () => {
    writeFileSync(trustFile(), "{not json");
    expect(resolveTrust(undefined, tmp)).toBe("med");
  });

  afterAll(() => rmSync(tmp, { recursive: true, force: true }));
});
