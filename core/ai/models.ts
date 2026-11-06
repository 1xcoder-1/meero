import type { Provider } from "./providers";

interface ProviderConfig {
  url: string;
  headers: Record<string, string>;
  extractModels: (data: any) => string[];
}

function getProviderConfig(provider: Provider, apiKey: string): ProviderConfig {
  switch (provider) {
    case "openai":
      return {
        url: "https://api.openai.com/v1/models",
        headers: { Authorization: `Bearer ${apiKey}` },
        extractModels: (data) => data.data.map((m: any) => m.id),
      };

    case "anthropic":
      return {
        url: "https://api.anthropic.com/v1/models",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        extractModels: (data) => data.data.map((m: any) => m.id),
      };

    case "gemini":
      return {
        url: `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
        headers: {},
        extractModels: (data) =>
          data.models
            .map((m: any) => m.name.replace("models/", ""))
            .filter((id: string) => id.startsWith("gemini")),
      };

    case "openrouter":
      return {
        url: "https://openrouter.ai/api/v1/models",
        headers: { Authorization: `Bearer ${apiKey}` },
        extractModels: (data) => data.data.map((m: any) => m.id),
      };

    case "groq":
      return {
        url: "https://api.groq.com/openai/v1/models",
        headers: { Authorization: `Bearer ${apiKey}` },
        extractModels: (data) => data.data.map((m: any) => m.id),
      };

    case "mistral":
      return {
        url: "https://api.mistral.ai/v1/models",
        headers: { Authorization: `Bearer ${apiKey}` },
        extractModels: (data) => data.data.map((m: any) => m.id),
      };
  }
}

export async function fetchModels(
  provider: Provider,
  apiKey: string,
): Promise<string[]> {
  const config = getProviderConfig(provider, apiKey);

  const res = await fetch(config.url, {
    headers: { "Content-Type": "application/json", ...config.headers },
  });

  if (!res.ok) {
    console.log(`[${provider}] Failed: ${res.status} ${res.statusText}`);
    throw new Error(`[${provider}] Failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return config.extractModels(data);
}

export async function fetchAllModels(
  keys: Partial<Record<Provider, string>>,
): Promise<string[]> {
  const entries = Object.entries(keys) as [Provider, string][];

  const results = await Promise.allSettled(
    entries.map(([provider, apiKey]) => fetchModels(provider, apiKey)),
  );

  return results.flatMap((result, i) => {
    if (result.status === "fulfilled") return result.value;
    console.error(
      `[${entries[i]?.[0] ?? "unknown"}] Error:`,
      result.reason.message,
    );
    return [];
  });
}
