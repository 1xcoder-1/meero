import { existsSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import type { Provider } from "../ai/providers";
import { confirm, select } from "@inquirer/prompts";
import { fetchModels } from "../ai/models";

type Config = {
  provider: Provider;
  apiKey: string;
  model: string;
  /** Tier-3 local-first "cheap mode" */
  localEnabled?: boolean;
  localModel?: string;
};

const configPath = `${homedir()}/.meero/config.json`;

export function loadConfig(): Config {
  if (!existsSync(configPath)) {
    console.error("Run: meero setup");
    process.exit(1);
  }

  return JSON.parse(readFileSync(configPath, "utf-8"));
}

export function overwriteConfig(config: Config): void {
  const serialized = JSON.stringify(config, null, 2);
  writeFileSync(configPath, serialized, "utf-8");
}

export async function changeModel(): Promise<void> {
  try {
    const config = loadConfig();
    const model = await select({
      message: "Select model",
      choices: await fetchModels(config.provider, config.apiKey),
    });
    config.model = model;
    overwriteConfig(config);
    console.log(`Model changed to ${model}`);
  } catch (error) {
    console.error(error);
  }
}
