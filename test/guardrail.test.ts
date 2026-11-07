import { expect, test, describe } from "bun:test";
import { isCasualChat } from "../core/cli/guardrail";

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
});
