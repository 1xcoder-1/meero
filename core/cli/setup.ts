import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "fs";
import { homedir } from "os";
import { select, password, confirm } from "@inquirer/prompts";
import { fetchModels } from "../ai/models";
import type { Provider } from "../ai/providers";

const configDir = `${homedir()}/.meero`;
const configPath = `${configDir}/config.json`;

export async function setup() {
  try {
    const provider = await select({
      message: "Select provider",
      choices: [
        { name: "OpenAI", value: "openai" },
        { name: "Anthropic", value: "anthropic" },
        { name: "Gemini", value: "gemini" },
        { name: "OpenRouter", value: "openrouter" },
        { name: "Groq", value: "groq" },
        { name: "Mistral", value: "mistral" },
      ],
    });

    const apiKey = await password({
      message: "Enter API Key",
      mask: "*",
      validate: (v) => (v && v.length > 10 ? true : "Invalid API key"),
    });

    const model = await select({
      message: "Select model",
      choices: await fetchModels(provider as Provider, apiKey),
    });

    if (existsSync(configPath)) {
      const overwrite = await confirm({
        message: "Config already exists. Overwrite?",
      });

      if (!overwrite) {
        console.log("Cancelled");
        return;
      }
    }

    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }

    // preserve keys setup does not manage (localEnabled, localModel)
    const prev = existsSync(configPath)
      ? JSON.parse(readFileSync(configPath, "utf-8"))
      : {};
    writeFileSync(
      configPath,
      JSON.stringify({ ...prev, provider, apiKey, model }, null, 2),
    );

    console.log("✔ Setup complete");
  } catch (e) {
    console.error("Setup failed");
    process.exit(1);
  }
}

export function reset() {
  try {
    if (!existsSync(configPath)) {
      console.log("No config found");
      return;
    }

    rmSync(configPath);
    console.log("✔ Config removed");
  } catch {
    console.error("Reset failed");
    process.exit(1);
  }
}
