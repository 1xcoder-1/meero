import type { Metadata } from "next";
import Link from "next/link";
import { Pre, C, Pager } from "@/components/md";
import { docsPager } from "@/lib/docs";

export const metadata: Metadata = {
  title: "Commands & flags",
  description:
    "Command and flag reference for meero: the task syntax, CLI commands, slash commands and every global option you can pass.",
};

const p = docsPager("/docs/reference");

export default function Reference() {
  return (
    <>
      <h1>Commands &amp; flags</h1>
      <p>
        The complete CLI surface. The same reference is always one keystroke
        away in the terminal: <C>meero commands</C> (or <C>meero /commands</C>)
        is generated from the real pack catalog, so it can never drift from
        the code.
      </p>

      <h2>Tasks</h2>
      <table>
        <thead>
          <tr><th>Command</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><C>meero &quot;&lt;task&gt;&quot;</C></td><td>AI generates and runs shell commands for your shell</td></tr>
          <tr><td><C>meero commit all my changes</C></td><td>AI task, typed without quotes too</td></tr>
          <tr><td><C>meero &lt;pack&gt; [args]</C></td><td>Run a pre-built pack directly, no AI</td></tr>
          <tr><td><C>meero /&lt;command&gt;</C></td><td>Same commands in slash form</td></tr>
          <tr><td><C>meero</C></td><td>The help box. There is no chat mode</td></tr>
        </tbody>
      </table>

      <h2>Commands</h2>
      <table>
        <thead>
          <tr><th>Command</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><C>meero setup</C></td><td>Configure provider + API key (masked input)</td></tr>
          <tr><td><C>meero settings</C></td><td>Model, provider and cheap mode in one page</td></tr>
          <tr><td><C>meero model [name]</C></td><td>List or switch the active model</td></tr>
          <tr><td><C>meero undo [id] [--list]</C></td><td>Revert a task&apos;s file changes</td></tr>
          <tr><td><C>meero history [--clear]</C></td><td>Recent tasks and outcomes</td></tr>
          <tr><td><C>meero trust [level] [--here]</C></td><td>Confirmation strictness: low | med | high</td></tr>
          <tr><td><C>meero local on|off|status [model]</C></td><td>Ollama cheap-mode routing</td></tr>
          <tr><td><C>meero recipe list|rm|export|import</C></td><td>Saved playbooks</td></tr>
          <tr><td><C>meero recipes</C></td><td>Alias of <C>meero recipe list</C></td></tr>
          <tr><td><C>meero run &lt;name&gt;</C></td><td>Execute a saved recipe, no LLM</td></tr>
          <tr><td><C>meero builtin [id] [args]</C></td><td>Pre-built pack menu / run one directly</td></tr>
          <tr><td><C>meero builtins</C></td><td>Alias of <C>meero builtin</C> (interactive menu)</td></tr>
          <tr><td><C>meero commands</C></td><td>Full reference: every command, flag and pack</td></tr>
          <tr><td><C>meero help</C></td><td>Short help box</td></tr>
          <tr><td><C>meero reset</C></td><td>Wipe configuration to defaults</td></tr>
          <tr><td><C>meero -v, --version</C></td><td>Print the version</td></tr>
        </tbody>
      </table>

      <h2>Flags</h2>
      <table>
        <thead>
          <tr><th>Flag</th><th>Effect</th></tr>
        </thead>
        <tbody>
          <tr><td><C>--print</C> / <C>--dry-run</C></td><td>Print commands, never execute (scriptable)</td></tr>
          <tr><td><C>--copy</C></td><td>Copy generated commands to the clipboard</td></tr>
          <tr><td><C>--dry-run</C> (in task text)</td><td>Show the blast-radius preview without running</td></tr>
          <tr><td><C>--trust &lt;level&gt;</C></td><td>Override trust for this run only</td></tr>
          <tr><td><C>--sandbox [image]</C></td><td>Execute inside Docker (default <C>alpine:latest</C>)</td></tr>
          <tr><td><C>--local</C></td><td>Prefer a local Ollama model for this task</td></tr>
        </tbody>
      </table>

      <h2>Always on</h2>
      <Pre>
        <code>{`safety gate · blast-radius preview · web cross-check · self-repair
undo snapshots · cost line · shell auto-detect · chat guardrail`}</code>
      </Pre>

      <p>
        See also <Link href="/docs/builtins">the full pack catalog</Link> and{" "}
        <Link href="/docs/slash-commands">slash commands</Link>.
      </p>

      <Pager prev={p.prev} next={p.next} />
    </>
  );
}
