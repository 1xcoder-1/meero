import type { Metadata } from "next";
import Link from "next/link";
import { Pre, C, Callout, Pager } from "@/components/md";
import { docsPager } from "@/lib/docs";

export const metadata: Metadata = {
  title: "Usage & workflow",
  description:
    "The meero workflow end to end: what it inspects, how it shows the commands, how you approve them and what happens when something fails.",
};

const p = docsPager("/docs/usage");

export default function Usage() {
  return (
    <>
      <h1>Usage &amp; workflow</h1>

      <h2>Natural-language tasks</h2>
      <Pre>
        <code>{`meero commit all my changes
meero delete all .tmp files in the project
meero create a new git branch called feature-xyz
meero what is the command to initialise a vite project`}</code>
      </Pre>
      <p>The full workflow for every task:</p>
      <ol>
        <li>Your request goes to the AI together with live system context.</li>
        <li>The AI inspects files / searches the web / calls <C>returnCommands</C> with the result.</li>
        <li>Commands are shown in a box with a cost line (tokens + $ estimate).</li>
        <li>You confirm, or edit the list inline, before anything runs.</li>
        <li>Commands execute sequentially; if one fails, the AI gets the real output and repairs the rest.</li>
        <li>Destructive targets are snapshotted first, so <C>meero undo</C> can bring them back.</li>
      </ol>

      <h2>Shell-aware generation</h2>
      <p>
        meero detects your exact shell. That could be PowerShell 7, Windows
        PowerShell 5.1, cmd.exe, bash, zsh or sh. It only makes commands that
        shell can actually run. <C>&amp;&amp;</C> never appears inside Windows
        PowerShell 5.1. The inline editor uses <C>;</C> there instead. Inside{" "}
        <Link href="/docs/sandbox">the sandbox</Link> the target is POSIX{" "}
        <C>sh</C>.
      </p>

      <h2>Interactive mode &amp; casual chat</h2>
      <p>
        Run <C>meero</C> in a terminal (or <C>meero interactive</C>) to start
        an interactive multi-step REPL that keeps session context. Casual
        conversation is refused locally before any model call. Developer and
        technical questions can be answered briefly in plain text when no
        command should run.
      </p>
      <Pre>
        <code>{`meero                       # interactive task mode (TTY)
meero interactive           # same (alias: i, repl)
meero hi                    # refused locally — no AI call, no tokens
meero "what does -x mean?"  # technical explanation (no commands)`}</code>
      </Pre>
      <p>
        AI runs only for a real developer task. Even then the model must
        return shell commands. Small talk comes back as nothing, and the model
        may not touch its tools for it. Typo-prefixed chat
        (<C>meero hi</C> after a stray key) is caught by the same guardrail.
      </p>

      <h2>Routing order</h2>
      <p>Every input is resolved in this order, before the model is ever considered:</p>
      <table>
        <thead>
          <tr><th>Typed</th><th>Resolves to</th><th>AI called?</th></tr>
        </thead>
        <tbody>
          <tr><td><C>meero /settings</C></td><td>slash command → settings page</td><td>no</td></tr>
          <tr><td><C>meero status 3000</C></td><td>built-in pack → runs directly</td><td>no</td></tr>
          <tr><td><C>meero hi</C></td><td>chat guardrail → refused</td><td>no</td></tr>
          <tr><td><C>meero commit all my changes</C></td><td>developer task → AI generates commands</td><td>yes</td></tr>
        </tbody>
      </table>
      <Callout kind="info">
        A command that exists locally can never leak into a model call. See{" "}
        <Link href="/docs/slash-commands">slash commands</Link>.
      </Callout>

      <h2>Editing before execution</h2>
      <p>
        At the <em>Execute these commands?</em> prompt you can pick{" "}
        <strong>Modify</strong>: the command list is pre-filled on the input
        line, joined with the correct separator for your shell. Whatever
        you leave is what runs.
      </p>

      <h2>AI commits</h2>
      <p>
        <C>meero commit</C> makes a fresh commit from staged changes with an
        AI-written message; <C>meero recommit</C> rewrites the messages of your
        past commits. See <Link href="/docs/commits">AI commits</Link>.
      </p>

      <h2>Self-repair</h2>
      <p>
        When a command fails, meero captures its real output and offers to let
        the AI fix the remaining steps. You get up to 3 rounds. A fix replaces
        everything still pending for the task. It goes through the same safety
        gate and snapshot as the original plan.
      </p>

      <Pager prev={p.prev} next={p.next} />
    </>
  );
}
