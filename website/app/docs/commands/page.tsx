import type { Metadata } from "next";
import Link from "next/link";
import { Pre, C, Callout, Pager } from "@/components/md";
import { docsPager } from "@/lib/docs";
import { PACK_GROUPS } from "@/lib/packs";

export const metadata: Metadata = {
  title: "All commands",
  description:
    "Every meero command and flag in one place: CLI commands, slash commands, global flags and the 60 ready-made command packs.",
};

const p = docsPager("/docs/commands");

export default function AllCommands() {
  return (
    <>
      <h1>All commands</h1>
      <p>
        Every command meero knows, with what it does, all on one page. You can
        also see this list inside the terminal: run <C>meero commands</C> (or{" "}
        <C>meero /commands</C>). It is built from the real code, so it is
        always up to date.
      </p>

      <h2>1. Plain English tasks</h2>
      <table>
        <thead>
          <tr><th>Command</th><th>What it does</th></tr>
        </thead>
        <tbody>
          <tr><td><C>meero &quot;&lt;task&gt;&quot;</C></td><td>meero looks at your system, makes the shell commands for your exact shell, shows them with the cost, and runs them only after you say yes</td></tr>
          <tr><td><C>meero commit all my changes</C></td><td>The same thing, without quotes</td></tr>
          <tr><td><C>meero what is the command to initialise a vite project</C></td><td>Questions work too. The answer is always commands, never chat</td></tr>
          <tr><td><C>meero</C></td><td>Shows the help box. There is no chat mode</td></tr>
        </tbody>
      </table>

      <h2>2. CLI commands</h2>
      <table>
        <thead>
          <tr><th>Command</th><th>What it does</th></tr>
        </thead>
        <tbody>
          <tr><td><C>meero setup</C></td><td>Pick a provider and paste your API key (hidden while you type)</td></tr>
          <tr><td><C>meero settings</C></td><td>Model, provider and cheap mode on one page</td></tr>
          <tr><td><C>meero model [name]</C></td><td>Show models, or switch to one</td></tr>
          <tr><td><C>meero undo [id] [--list]</C></td><td>Put back the files a task changed</td></tr>
          <tr><td><C>meero history [--clear]</C></td><td>Show recent tasks, or clear them</td></tr>
          <tr><td><C>meero trust [level] [--here]</C></td><td>How strict confirmations are: low, med or high, per folder</td></tr>
          <tr><td><C>meero local on|off|status [model]</C></td><td>Cheap mode: use a local Ollama model first, go to the cloud only when needed</td></tr>
          <tr><td><C>meero recipe list|rm|export|import</C></td><td>Manage saved playbooks</td></tr>
          <tr><td><C>meero recipes</C></td><td>Same as <C>meero recipe list</C></td></tr>
          <tr><td><C>meero run &lt;name&gt;</C></td><td>Run a saved recipe. No AI call, no cost</td></tr>
          <tr><td><C>meero builtin [id] [args]</C></td><td>Show the pack menu, or run one pack directly</td></tr>
          <tr><td><C>meero builtins</C></td><td>Same as <C>meero builtin</C></td></tr>
          <tr><td><C>meero commands</C></td><td>This full list, inside the terminal</td></tr>
          <tr><td><C>meero help</C></td><td>The short help box</td></tr>
          <tr><td><C>meero reset</C></td><td>Wipe settings back to defaults</td></tr>
          <tr><td><C>meero -v, --version</C></td><td>Show the version</td></tr>
        </tbody>
      </table>

      <h2>3. Slash commands</h2>
      <p>
        Every command meero answers by itself also works with a slash. Same
        result, same arguments, <strong>no AI call</strong>:
      </p>
      <Pre>
        <code>{`meero /settings              # provider, model and cheap mode on one page
meero /model                 # show models (or: meero /model gemini-2.5-flash)
meero /builtin               # the ready-made pack menu
meero /undo                  # put back the files from the last task  (/undo --list to see them)
meero /trust low             # how strict confirmations are (/trust shows the current level)
meero /commands              # full list: every command, flag and pack
meero /help                  # the short help box
meero /exit                  # there is nothing to exit. one task per call`}</code>
      </Pre>
      <Callout kind="ok">
        meero checks in this order: slash command, then ready-made pack, then
        settings, then the chat guard, and only at the end the AI. A command
        that lives in the terminal can never turn into an AI call.
      </Callout>

      <h2>4. Flags</h2>
      <table>
        <thead>
          <tr><th>Flag</th><th>What it does</th></tr>
        </thead>
        <tbody>
          <tr><td><C>--print</C> / <C>--dry-run</C></td><td>Show the commands but run nothing. Good for scripts</td></tr>
          <tr><td><C>--copy</C></td><td>Put the commands straight on the clipboard</td></tr>
          <tr><td><C>--dry-run</C> (inside the task text)</td><td>Show which files would be touched, without running</td></tr>
          <tr><td><C>--trust &lt;level&gt;</C></td><td>Use another trust level for this one run</td></tr>
          <tr><td><C>--sandbox [image]</C></td><td>Run inside Docker (default <C>alpine:latest</C>). Your machine stays untouched</td></tr>
          <tr><td><C>--local</C></td><td>Try a local Ollama model for this task first</td></tr>
        </tbody>
      </table>

      <h2>5. The 60 ready-made command packs</h2>
      <p>
        Type the pack name directly: <C>meero status</C>,{" "}
        <C>meero kill-port 8080</C>. The full name also works (
        <C>meero git-status</C>). No AI and no cost. meero picks the right
        version for your shell and system. Safe packs run at once. Packs
        marked ! ask you one time. They always show what they touched.
      </p>
      {PACK_GROUPS.map((g) => (
        <div key={g.group}>
          <h3>{g.group}</h3>
          <table>
            <thead>
              <tr><th>Command</th><th>Short form</th><th>What it does</th></tr>
            </thead>
            <tbody>
              {g.rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <C>{`meero ${r.id}`}</C>
                    {r.args ? (
                      <span className="text-faint"> {r.args}</span>
                    ) : null}
                  </td>
                  <td><C>{`meero ${r.alias}`}</C></td>
                  <td>
                    {r.risky ? (
                      <span
                        title="asks you once before running"
                        className="mr-1 text-warn"
                      >
                        !
                      </span>
                    ) : null}
                    {r.desc}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <h2>Always on</h2>
      <Pre>
        <code>{`safety gate, file preview before running, web check for odd commands, self repair
backups for undo, cost line after every task, shell auto-detect, no chat allowed`}</code>
      </Pre>

      <p>
        Want more detail? Read about{" "}
        <Link href="/docs/safety">safety, trust and undo</Link>,{" "}
        <Link href="/docs/recipes">recipes</Link>,{" "}
        <Link href="/docs/sandbox">the sandbox</Link> and{" "}
        <Link href="/docs/cheap-mode">cheap mode</Link>.
      </p>

      <Pager prev={p.prev} next={p.next} />
    </>
  );
}
