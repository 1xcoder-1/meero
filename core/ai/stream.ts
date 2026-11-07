import { loadConfig } from "../cli/config";
import { parseCommands } from "../input";
import type { ModelMessage } from "ai";
import { getModel, getOllamaModel, ollamaAvailable } from "./providers";
import { runLLM, type RunResult } from "./run";
import type { Usage } from "./usage";
import chalk from "chalk";

export interface GenerateResult extends RunResult {
  /** which model string actually served the request (for cost line) */
  modelUsed: string;
  usedLocal: boolean;
}

export interface GenerateOpts {
  history?: ModelMessage[];
  /** override config's local setting for this call */
  preferLocal?: boolean;
  /** override the default system prompt (e.g. sandbox = POSIX sh inside docker) */
  systemPrompt?: string;
}

/**
 * Local-first "cheap mode": when enabled, a reachable Ollama gets the shot
 * first; if it is down, fails, or returns no usable commands we escalate
 * to the configured cloud model. The user always sees which path ran.
 */
export async function generateStream(
  prompt: string,
  opts: GenerateOpts = {},
): Promise<GenerateResult> {
  const { provider, apiKey, model, localEnabled, localModel } = loadConfig();
  const wantLocal = opts.preferLocal ?? localEnabled ?? false;

  if (wantLocal) {
    if (await ollamaAvailable()) {
      const lm = localModel || "llama3.1";
      const res = await runLLM(getOllamaModel(lm), prompt, opts.history, opts.systemPrompt);
      const usable = res.text !== null && parseCommands(res.text).length > 0;
      if (usable) {
        console.log(chalk.dim(`  ⚡ served locally (ollama/${lm})`));
        return { ...res, modelUsed: lm, usedLocal: true };
      }
      console.log(
        chalk.dim(
          "  local model returned no usable commands — escalating to cloud",
        ),
      );
    } else {
      console.log(
        chalk.dim(
          "  ollama not reachable (start it with `ollama serve`) — using cloud",
        ),
      );
    }
  }

  const res = await runLLM(getModel(provider, apiKey, model), prompt, opts.history, opts.systemPrompt);
  return { ...res, modelUsed: model, usedLocal: false };
}

export type { Usage };
