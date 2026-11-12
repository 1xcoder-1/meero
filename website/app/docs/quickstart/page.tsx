import type { Metadata } from "next";
import Link from "next/link";
import { Pre, C, Callout, Pager } from "@/components/md";
import { docsPager } from "@/lib/docs";

export const metadata: Metadata = {
  title: "Quickstart",
  description:
    "From a fresh install to your first working task: set up a provider, run your first natural-language task and try the free command packs.",
};

const p = docsPager("/docs/quickstart");

export default function Quickstart() {
  return (
    <>
      <h1>Quickstart</h1>
      <p>
        From a fresh install to your first AI-generated task in under two
        minutes.
      </p>

      <h2>1. Configure a provider</h2>
      <Pre>
        <code>{`meero setup          # pick a provider, paste your API key (masked)`}</code>
      </Pre>
      <p>
        Supported providers: OpenAI, Anthropic, Google Gemini, Groq, Mistral,
        OpenRouter and anything else with an OpenAI-compatible API. Switch the
        model any time with <C>meero model</C>. The config lives in{" "}
        <C>~/.meero/config.json</C>.
      </p>
      <Callout kind="info">
        No API key? You can still use the{" "}
        <Link href="/docs/builtins">60 pre-built command packs</Link>, they
        run with zero AI and zero cost.
      </Callout>

      <h2>2. Run your first task</h2>
      <Pre>
        <code>{`meero commit all my changes
meero delete all .tmp files in the project
meero create a new git branch called feature-xyz
meero what is the command to initialise a vite project`}</code>
      </Pre>
      <p>
        meero shows the generated commands in a box, prints a dim cost line
        (tokens + approximate $), and asks before executing anything. You can
        confirm, decline, or pick <em>Modify</em> to edit the list inline.
      </p>

      <h2>3. Try the no-AI packs</h2>
      <Pre>
        <code>{`meero status              # branch status + last 5 commits, instantly
meero kill-port 8080      # asks once, then kills whatever listens
meero whoport 3000        # who is hogging the port? (EADDRINUSE fixer)
meero doctor              # node / npm / git / docker health check
meero builtin             # the interactive grouped menu`}</code>
      </Pre>

      <h2>4. Undo if anything went sideways</h2>
      <Pre>
        <code>{`meero undo                # restore the last destructive task
meero undo --list         # available snapshots`}</code>
      </Pre>

      <h2>What meero never does</h2>
      <ul>
        <li><strong>No chat.</strong> <C>meero hi</C> is refused before any AI call. meero is a developer tool, not a chatbot.</li>
        <li><strong>No silent execution.</strong> Nothing runs without your consent unless you explicitly set <Link href="/docs/safety">trust high</Link>, and even then the safety gate stays armed.</li>
        <li><strong>No runaway cost.</strong> Every AI task prints its token usage and dollar estimate.</li>
      </ul>

      <p>
        Next: <Link href="/docs/configuration">configure meero properly</Link>,
        or learn about <Link href="/docs/slash-commands">slash commands</Link>{" "}
        and <Link href="/docs/recipes">recipes</Link>.
      </p>

      <Pager prev={p.prev} next={p.next} />
    </>
  );
}
