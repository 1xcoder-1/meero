import type { Metadata } from "next";
import Link from "next/link";
import { Pre, C, Callout, Pager } from "@/components/md";
import { docsPager } from "@/lib/docs";

export const metadata: Metadata = {
  title: "Cheap mode (Ollama)",
  description:
    "Run meero locally with Ollama first and only escalate to the cloud when the local model is not enough - cheaper and faster for small tasks.",
};

const p = docsPager("/docs/cheap-mode");

export default function CheapMode() {
  return (
    <>
      <h1>Cheap mode (Ollama)</h1>
      <p>
        Cheap mode makes generation <strong>local-first</strong>: meero asks
        Ollama first and only escalates to the cloud if the local model
        can&apos;t produce usable commands.
      </p>

      <Pre>
        <code>{`meero local on               # local-first from now on
meero local on qwen3:8b      # pick a model
meero local off
meero local status           # enabled? model? ollama reachable?`}</code>
      </Pre>

      <h2>Per-task override</h2>
      <Pre>
        <code>{`meero --local find all TODO comments in src/`}</code>
      </Pre>
      <p>
        <C>--local</C> prefers the local model for a single task without
        changing your saved setting.
      </p>

      <h2>Requirements</h2>
      <ul>
        <li><a href="https://ollama.com">Ollama</a> running on this machine (default port 11434).</li>
        <li>Set <C>OLLAMA_HOST</C> for non-default ports or a different box.</li>
        <li>Pull a model first, e.g. <C>ollama pull llama3.1</C>.</li>
      </ul>

      <Callout kind="info">
        If Ollama is unreachable, meero says so in <C>meero local status</C>{" "}
        and every task simply goes to the cloud provider, local failure
        never blocks a task.
      </Callout>

      <p>
        Combined with the <Link href="/docs/builtins">60 no-AI command
        packs</Link> (free by definition) and the <Link href="/docs/recipes">
        recipe replay path</Link> (no LLM call), most daily work can cost
        exactly $0.
      </p>

      <Pager prev={p.prev} next={p.next} />
    </>
  );
}
