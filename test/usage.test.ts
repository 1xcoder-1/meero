import { expect, test, describe } from "bun:test";
import { emptyUsage, estimateCost, formatUsage, type Usage } from "../core/ai/usage";

const u = (i: number, o: number): Usage => ({
  inputTokens: i,
  outputTokens: o,
  steps: 3,
  toolCalls: 2,
});

describe("usage & cost", () => {
  test("emptyUsage is all zero", () => {
    expect(emptyUsage()).toEqual({
      inputTokens: 0,
      outputTokens: 0,
      steps: 0,
      toolCalls: 0,
    });
  });

  test("known model cost math (gpt-4o: $2.5/M in, $10/M out)", () => {
    const c = estimateCost("gpt-4o-2024-11-20", u(1_000_000, 500_000));
    expect(c).toBeCloseTo(2.5 + 5, 5);
  });

  test("claude tier matching: opus > sonnet > haiku", () => {
    expect(estimateCost("claude-opus-4-1", u(1000, 0))).toBeCloseTo(0.015, 6);
    expect(estimateCost("claude-sonnet-4-5", u(1000, 0))).toBeCloseTo(0.003, 6);
    expect(estimateCost("claude-haiku-4-5", u(1000, 0))).toBeCloseTo(0.0008, 6);
  });

  test("mini variants price below their base", () => {
    expect(estimateCost("gpt-4o-mini", u(1000, 0))).toBeCloseTo(0.00015, 8);
  });

  test("unknown model → null cost, not a guess", () => {
    expect(estimateCost("my-private-llama-v7b", u(1000, 1000))).toBeNull();
  });

  test("formatUsage includes model, token counts, steps, tools", () => {
    const line = formatUsage(u(12345, 678), "gpt-4o");
    expect(line).toContain("gpt-4o");
    expect(line).toContain("12.3k in");
    expect(line).toContain("678 out");
    expect(line).toContain("3 step(s)");
    expect(line).toContain("2 tool call(s)");
    expect(line).toContain("$");
  });

  test("formatUsage degrades gracefully for unknown model", () => {
    const line = formatUsage(u(10, 10), "mystery-model");
    expect(line).toContain("cost unknown");
  });
});
