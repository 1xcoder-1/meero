/** Token/step accounting + approximate cost per task (AI SDK v6 usage) */

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  steps: number;
  toolCalls: number;
}

export function emptyUsage(): Usage {
  return { inputTokens: 0, outputTokens: 0, steps: 0, toolCalls: 0 };
}

/**
 * Approximate USD prices per 1M tokens: [match, input, output].
 * Deliberately coarse — enough for "did this cost a cent or a dollar".
 */
const PRICING: [RegExp, number, number][] = [
  [/gpt-4o-mini/, 0.15, 0.6],
  [/gpt-4o/, 2.5, 10],
  [/gpt-4\.1-mini/, 0.4, 1.6],
  [/gpt-4\.1/, 2, 8],
  [/o3-mini/, 1.1, 4.4],
  [/o[34]( |-|$)/, 10, 40],
  [/claude.*(opus)/, 15, 75],
  [/claude.*(sonnet)/, 3, 15],
  [/claude.*(haiku)/, 0.8, 4],
  [/gemini-2\.[0-9].*pro/, 1.25, 10],
  [/gemini-2\.[0-9].*flash/, 0.3, 2.5],
  [/deepseek/, 0.14, 0.28],
  [/qwen3/, 0.3, 1.5],
  [/mistral-small/, 0.1, 0.3],
  [/mistral-large/, 2, 6],
  [/llama-4|llama-3/, 0.05, 0.05], // groq/or — order of magnitude
];

/** null when the model is unknown → caller shows tokens without a price */
export function estimateCost(
  model: string,
  usage: Usage,
): number | null {
  const hit = PRICING.find(([re]) => re.test(model.toLowerCase()));
  if (!hit) return null;
  const [, pin, pout] = hit;
  return (
    (usage.inputTokens * pin + usage.outputTokens * pout) / 1_000_000
  );
}

function k(n: number): string {
  return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(n);
}

export function formatUsage(usage: Usage, model: string): string {
  const cost = estimateCost(model, usage);
  const money =
    cost === null
      ? "~ cost unknown for this model"
      : `~ $${cost < 0.01 ? cost.toFixed(4) : cost.toFixed(3)}`;
  return `◔ ${model} · ${k(usage.inputTokens)} in / ${k(usage.outputTokens)} out · ${usage.steps} step(s) · ${usage.toolCalls} tool call(s) · ${money}`;
}
