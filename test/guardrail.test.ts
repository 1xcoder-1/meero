import { expect, test, describe } from "bun:test";
import {
  isCasualChat,
  stripMeeroPrefix,
} from "../core/cli/guardrail";

describe("guardrail", () => {
  test("greetings and small talk are blocked before the LLM", () => {
    for (const t of [
      "hi",
      "hi!",
      "Hello",
      "hello there",
      "hey",
      "yo",
      "salam",
      "how are you",
      "hi how are you",
      "good morning",
      "thanks",
      "thank you so much",
      "who are you",
      "whats up",
      "bye",
      "ok",
      "kya haal",
    ]) {
      expect(isCasualChat(t)).toBe(true);
    }
  });

  test("developer tasks always pass through", () => {
    for (const t of [
      "kill process on port 3000",
      "hello world program in python",
      "update all packages",
      "git status",
      "list files larger than 100mb",
      "install docker on ubuntu",
      "run tests",
      "what command shows disk usage",
    ]) {
      expect(isCasualChat(t)).toBe(false);
    }
  });

  test("empty input is not casual (nothing to guard)", () => {
    expect(isCasualChat("")).toBe(false);
    expect(isCasualChat("   ")).toBe(false);
  });

  test("long sentences are never blocked even if they start politely", () => {
    expect(
      isCasualChat("hi can you help me configure the nginx server for my app"),
    ).toBe(false);
  });

  test("the raw prefixed form is NOT caught without the strip (why it exists)", () => {
    expect(isCasualChat("meero hi")).toBe(false);
  });
});

describe("stripMeeroPrefix", () => {
  test("removes typed/quoted meero prefixes so classification sees real words", () => {
    expect(stripMeeroPrefix("meero hi")).toBe("hi");
    expect(stripMeeroPrefix("Meero  hi")).toBe("hi");
    expect(stripMeeroPrefix("meero meero status")).toBe("status");
    expect(stripMeeroPrefix("miro how are you")).toBe("how are you");
    expect(stripMeeroPrefix("meero")).toBe("");
    expect(stripMeeroPrefix("kill process on port 3000")).toBe(
      "kill process on port 3000",
    );
  });

  test("prefix-stripped chat hits the guardrail — the meero-hi bug is dead", () => {
    for (const t of [
      "meero hi",
      "meero meero hi",
      "meero thanks",
      "meero how are you",
    ]) {
      expect(isCasualChat(stripMeeroPrefix(t))).toBe(true);
    }
  });

  test("prefix-stripped tasks still pass through as developer intent", () => {
    expect(isCasualChat(stripMeeroPrefix("meero commit all my changes"))).toBe(
      false,
    );
    expect(
      isCasualChat(stripMeeroPrefix("meero kill process on port 3000")),
    ).toBe(false);
  });
});
