import type { Metadata } from "next";
import { Pre, C, Callout, Pager } from "@/components/md";
import { docsPager } from "@/lib/docs";

export const metadata: Metadata = {
  title: "Safety, trust & undo",
  description:
    "How meero keeps you safe: the safety gate, blast-radius preview, trust levels per folder, undo snapshots and how risky packs behave.",
};

const p = docsPager("/docs/safety");

export default function Safety() {
  return (
    <>
      <h1>Safety, trust &amp; undo</h1>
      <p>
        Three independent layers stand between the AI and your machine. They
        are always on, at every trust level.
      </p>

      <h2>Layer 1: static rules</h2>
      <p>
        Patterns like <C>rm -rf /</C>, <C>shutdown</C>, <C>format</C>, fork
        bombs and disk wipes are blocked right away, before any prompt is
        shown. The rules also catch the sneaky forms: deletes aimed at{" "}
        <C>$env:USERPROFILE</C> / <C>os.homedir()</C>, short PowerShell
        aliases (<C>ri -re -fo</C>), <C>find -delete</C> on system paths,
        relative <C>rm -rf .</C>, and deletes smuggled through{" "}
        <C>python -c</C> / <C>node -e</C>.
      </p>

      <h2>Layer 2: blast-radius preview</h2>
      <p>
        Deletion / move / overwrite targets are resolved to real paths with
        real sizes before running. Git pushes list the exact commits that
        would leave your machine. To see the preview without running
        anything, put <C>--dry-run</C> in the task text. The preview also
        appears inside the gate.
      </p>

      <h2>Layer 3: the gate</h2>
      <Pre>
        <code>{`⛔ SAFETY GATE: destructive command detected
   blast radius: 1,204 files · 312 MB under ./dist
   type confirm to proceed, anything else aborts`}</code>
      </Pre>
      <p>
        Dangerous commands stop at a red box that demands typing{" "}
        <C>confirm</C>. meero also attaches web links that explain the
        command&apos;s risks.
      </p>

      <h2>Undo: file changes are reversible</h2>
      <p>
        Everything destructive is snapshotted first (into{" "}
        <C>~/.meero/trash</C>), so <C>meero undo</C> can restore it:
      </p>
      <Pre>
        <code>{`meero undo               # restore the last destructive task
meero undo --list        # available snapshots (id, time, files, first command)
meero undo <id>          # revert a specific snapshot`}</code>
      </Pre>
      <p>
        A revert reports what it did: restored / removed / skipped counts.
        Snapshot creation never blocks a run. If a snapshot fails you get a
        yellow warning telling you <C>meero undo</C> will not cover that run.
        Undo is file-level: a pushed commit, an API call or a database change
        is one-way — the gate stops these, but it cannot reverse them.
      </p>

      <h2>Secrets stay off the AI&apos;s radar</h2>
      <p>
        The read tools are enforced at runtime, not by prompt:{" "}
        <C>readFile</C>, <C>readFileLines</C> and <C>searchFiles</C> refuse
        credential paths — <C>.env*</C>, <C>~/.meero</C> config,{" "}
        <C>.ssh/</C>, <C>.aws/</C>, <C>.npmrc</C>, <C>*.pem</C>,{" "}
        <C>.git-credentials</C> and friends. The model can never paste your
        keys into a provider request or a web search.
      </p>

      <h2>Trust levels</h2>
      <table>
        <thead>
          <tr><th>Level</th><th>Behaviour</th></tr>
        </thead>
        <tbody>
          <tr><td><C>low</C></td><td>confirms every single command</td></tr>
          <tr><td><C>med</C> (default)</td><td>one confirmation per task</td></tr>
          <tr><td><C>high</C></td><td>auto-runs, but the safety gate still blocks destructive commands</td></tr>
        </tbody>
      </table>
      <Pre>
        <code>{`meero trust high             # globally
meero trust high --here      # only for this directory
meero --trust low "..."      # one run only`}</code>
      </Pre>

      <Callout kind="danger">
        Trust never disarms the gate. Even at <C>high</C>, a command that
        wipes, mass-deletes or force-pushes stops for an explicit{" "}
        <C>confirm</C>.
      </Callout>

      <Pager prev={p.prev} next={p.next} />
    </>
  );
}
