import { stepCountIs, streamText, type ModelMessage } from "ai";
import { SYSTEM_PROMPT } from "./system-prompt";
import {
  getCapturedCommands,
  resetCapturedCommands,
  tools,
} from "./tools";
import { emptyUsage, type Usage } from "./usage";

export interface RunResult {
  /** raw assistant text (or JSON of captured commands) — legacy contract */
  text: string | null;
  usage: Usage;
}

export async function runLLM(
  model: any,
  prompt: string,
  history?: ModelMessage[],
  systemPrompt?: string,
): Promise<RunResult> {
  const usage = emptyUsage();
  try {
    resetCapturedCommands();

    const result = streamText({
      model,
      system: systemPrompt ?? SYSTEM_PROMPT,
      ...(history && history.length > 0
        ? { messages: [...history, { role: "user", content: prompt }] }
        : { prompt }),
      tools: tools,
      stopWhen: stepCountIs(20),
    });

    let full = "";

    // fullStream (not textStream) so we also see tool calls + step usage
    for await (const part of result.fullStream) {
      switch (part.type) {
        case "text-delta":
          full += part.text;
          break;
        case "tool-call":
          usage.toolCalls++;
          break;
        case "finish-step": {
          usage.steps++;
          const u = (part as any).usage ?? (part as any).totalUsage;
          if (u) {
            usage.inputTokens += u.inputTokens ?? 0;
            usage.outputTokens += u.outputTokens ?? 0;
          }
          break;
        }
        case "error":
          throw part.error;
      }
    }

    // Structured output wins over text: the AI called returnCommands with
    // real arrays, so no regex/JSON text parsing can corrupt it.
    const captured = getCapturedCommands();
    if (captured && captured.length > 0) {
      return { text: JSON.stringify(captured), usage };
    }

    return { text: full, usage };
  } catch (e) {
    console.error(
      `\nLLM request failed: ${e instanceof Error ? e.message : String(e)}`,
    );
    console.error("Check your API key / model with: meero setup");
    return { text: null, usage };
  }
}
