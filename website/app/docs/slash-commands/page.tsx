import type { Metadata } from "next";
import { Pre, C, Callout, Pager } from "@/components/md";
import { docsPager } from "@/lib/docs";

export const metadata: Metadata = {
  title: "Slash commands",
  description:
    "Every meero command also works as a slash command: /settings, /model, /builtin, /undo, /trust, /commands, /help and /exit.",
};

const p = docsPager("/docs/slash-commands");

export default function SlashCommands() {
  return (
    <>
      <h1>Slash commands</h1>
      <p>
        Every command meero can answer locally also works in slash form, same behaviour, same arguments, <strong>no AI call</strong>:
      </p>

      <Pre>
        <code>{`meero /settings              # provider, model and cheap mode in one page
meero /model                 # list models (or: meero /model gemini-2.5-flash)
meero /builtin               # the pre-built pack menu
meero /undo                  # revert the last task  (/undo --list for snapshots)
meero /trust low             # confirmation strictness (/trust shows the current one)
meero /commands              # full reference: every command, flag and pack
meero /commit                # fresh commit, AI message
meero /recommit              # rewrite past commit messages
meero /help                  # the short help box
meero /exit                  # nothing to exit, one task per call`}</code>
      </Pre>

      <h2>The full list</h2>
      <table>
        <thead>
          <tr><th>Slash</th><th>Plain form</th><th>What it does</th></tr>
        </thead>
        <tbody>
          <tr><td><C>/settings</C></td><td><C>meero settings</C></td><td>Model, provider and cheap mode in one page</td></tr>
          <tr><td><C>/model [name]</C></td><td><C>meero model</C></td><td>List or switch the active model</td></tr>
          <tr><td><C>/builtin</C></td><td><C>meero builtin</C></td><td>Interactive pre-built pack menu (no AI)</td></tr>
          <tr><td><C>/undo [id] / --list</C></td><td><C>meero undo</C></td><td>Revert files changed by the last task</td></tr>
          <tr><td><C>/trust [level] [--here]</C></td><td><C>meero trust</C></td><td>Confirmation strictness, per directory supported</td></tr>
          <tr><td><C>/commands</C></td><td><C>meero commands</C></td><td>Full reference: every command, flag and pack</td></tr>
          <tr><td><C>/commit</C></td><td><C>meero commit</C></td><td>Fresh commit from staged changes (AI message)</td></tr>
          <tr><td><C>/recommit</C></td><td><C>meero recommit</C></td><td>Rewrite past commit messages with AI</td></tr>
          <tr><td><C>/help</C></td><td><C>meero help</C></td><td>The short help box</td></tr>
          <tr><td><C>/exit</C>, <C>/quit</C></td><td>-</td><td>Reminds you there is nothing to exit</td></tr>
        </tbody>
      </table>

      <h2>How routing works</h2>
      <p>
        Slash invocations are resolved from raw argv <em>before</em> anything
        else: slash → built-in pack → meero-config question → chat guardrail
        → only then the AI. <C>meero /xyz</C> and the plain subcommand (
        <C>meero settings</C>) run the exact same code. Nothing is duplicated.
      </p>
      <Callout kind="ok">
        An unknown <C>/xyz</C> is answered with a hint listing the valid
        slash commands. It is never sent to the model.
      </Callout>
      <p>
        A leading global flag (<C>meero --print /help</C>) is left to the
        option parser, and the router&apos;s slash case still catches it.
      </p>

      <Pager prev={p.prev} next={p.next} />
    </>
  );
}
