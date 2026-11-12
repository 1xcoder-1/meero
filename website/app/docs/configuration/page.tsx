import type { Metadata } from "next";
import Link from "next/link";
import { Pre, C, Callout, Pager } from "@/components/md";
import { docsPager } from "@/lib/docs";

export const metadata: Metadata = {
  title: "Configuration",
  description:
    "Providers, models, API keys, trust levels, cheap mode with Ollama and the ~/.meero/config.json file - everything meero can be configured with.",
};

const p = docsPager("/docs/configuration");

export default function Configuration() {
  return (
    <>
      <h1>Configuration</h1>
      <p>
        All settings live in <C>~/.meero/config.json</C>. They are managed
        through real commands. There is no chat mode for changing them.
      </p>

      <Pre>
        <code>{`meero setup           # pick a provider, paste your API key (masked)
meero model           # switch model later (interactive list)
meero model <name>    # …or set it directly
meero settings        # provider, model and cheap mode in one page
meero reset          # wipe configuration`}</code>
      </Pre>

      <h2>Providers</h2>
      <p>
        meero talks to any major provider through the Vercel AI SDK:
      </p>
      <table>
        <thead>
          <tr><th>Provider</th><th>Notes</th></tr>
        </thead>
        <tbody>
          <tr><td>OpenAI</td><td>GPT family; default choice</td></tr>
          <tr><td>Anthropic</td><td>Claude family</td></tr>
          <tr><td>Google Gemini</td><td>Gemini family, flash models are very cheap</td></tr>
          <tr><td>Groq</td><td>Fast Llama family inference</td></tr>
          <tr><td>Mistral</td><td>Mistral family</td></tr>
          <tr><td>OpenRouter</td><td>Anything routable through OpenRouter</td></tr>
          <tr><td>Ollama (local)</td><td>Used by <Link href="/docs/cheap-mode">cheap mode</Link>; no API key needed</td></tr>
        </tbody>
      </table>

      <h2>Settings page</h2>
      <Pre>
        <code>{`$ meero settings

  provider    openai
  model       gpt-5-mini
  cheap mode  off · local model: llama3.1 · ollama: not running
  config      ~/.meero/config.json`}</code>
      </Pre>
      <p>
        From this page you can change the model, re-run setup (provider + API
        key) or toggle cheap mode, all inline, no AI call. The same page is
        reachable as <C>meero /settings</C>.
      </p>

      <h2>Trust default</h2>
      <Pre>
        <code>{`meero trust med              # globally (default)
meero trust high --here      # only for this directory
meero --trust low "..."      # one run only`}</code>
      </Pre>
      <p>
        See <Link href="/docs/safety">Safety, trust &amp; undo</Link> for what
        each level means.
      </p>

      <Callout kind="warn">
        Your API key is stored in <C>~/.meero/config.json</C> on your own
        machine and is only ever sent to the provider you selected. meero has
        no telemetry and no third-party servers of its own.
      </Callout>

      <Pager prev={p.prev} next={p.next} />
    </>
  );
}
