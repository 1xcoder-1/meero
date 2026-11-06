import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createMistral } from "@ai-sdk/mistral";
import { createGroq } from "@ai-sdk/groq";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

export type Provider =
  | "openai"
  | "anthropic"
  | "gemini"
  | "openrouter"
  | "groq"
  | "mistral";

/** Ollama exposes an OpenAI-compatible endpoint — no extra dependency needed */
export const OLLAMA_BASE_URL =
  process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";

export function getOllamaModel(model: string) {
  return createOpenAI({
    baseURL: `${OLLAMA_BASE_URL}/v1`,
    apiKey: "ollama", // local server accepts anything
  })(model);
}

/** Cheap liveness probe for the local-first "cheap mode" */
export async function ollamaAvailable(timeoutMs = 1500): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function getModel(provider: Provider, apiKey: string, model: string) {
  if (provider === "openai") {
    return createOpenAI({ apiKey })(model);
  }

  if (provider === "anthropic") {
    return createAnthropic({ apiKey })(model);
  }

  if (provider === "gemini") {
    return createGoogleGenerativeAI({ apiKey })(model);
  }

  if (provider === "mistral") {
    return createMistral({ apiKey })(model);
  }

  if (provider === "groq") {
    return createGroq({ apiKey })(model);
  }

  if (provider === "openrouter") {
    return createOpenRouter({ apiKey })(model);
  }

  throw new Error("Invalid provider");
}
