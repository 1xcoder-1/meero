import { describe, expect, test } from "bun:test";
import { normalizeCommands, parseCommands } from "../core/input";

describe("parseCommands", () => {
  test("plain JSON array", () => {
    expect(parseCommands('["ls -la", "pwd"]')).toEqual(["ls -la", "pwd"]);
  });

  test("commands with escaped quotes (the old regex breakage case)", () => {
    const out = '["git commit -m \\"initial msg\\""]';
    expect(parseCommands(out)).toEqual(['git commit -m "initial msg"']);
  });

  test("JSON array surrounded by prose", () => {
    expect(parseCommands('Here you go:\n["echo hi"]\nEnjoy!')).toEqual([
      "echo hi",
    ]);
  });

  test("JSON array inside fenced code block", () => {
    expect(parseCommands('Sure!\n```json\n["docker ps"]\n```')).toEqual([
      "docker ps",
    ]);
  });

  test("empty array stays empty", () => {
    expect(parseCommands("[]")).toEqual([]);
  });

  test("filters out non-string entries", () => {
    expect(parseCommands('["ok", 42, null, true, "also ok"]')).toEqual([
      "ok",
      "also ok",
    ]);
  });

  test("garbage input returns empty array, not a crash", () => {
    expect(parseCommands("I could not generate commands")).toEqual([]);
    expect(parseCommands("[not json]")).toEqual([]);
    expect(parseCommands('["unterminated]')).toEqual([]);
    expect(parseCommands("")).toEqual([]);
  });

  test("object wrapper still yields the inner array (lenient recovery)", () => {
    // If a model wraps its answer like {"commands": ["ls"]}, we recover
    // the array instead of failing outright.
    expect(parseCommands('{"commands": ["ls"]}')).toEqual(["ls"]);
  });

  test("prose with bracket noise that is not valid JSON yields empty", () => {
    expect(parseCommands("see steps [1] and [2] below")).toEqual([]);
  });
});

describe("normalizeCommands", () => {
  test("collapses whitespace and trims", () => {
    expect(normalizeCommands(["  git   commit   -m   x  "])).toEqual([
      "git commit -m x",
    ]);
  });

  test("handles non-array input", () => {
    expect(normalizeCommands(undefined as any)).toEqual([]);
    expect(normalizeCommands(null as any)).toEqual([]);
  });

  test("keeps command order", () => {
    expect(normalizeCommands(["a", "b", "c"])).toEqual(["a", "b", "c"]);
  });
});
