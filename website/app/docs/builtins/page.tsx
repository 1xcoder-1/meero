import type { Metadata } from "next";
import Link from "next/link";
import { Pre, C, Callout, Pager } from "@/components/md";
import { docsPager } from "@/lib/docs";
import { PACK_GROUPS } from "@/lib/packs";

export const metadata: Metadata = {
  title: "Pre-built command packs",
  description:
    "The 60 pre-built meero command packs for git, docker, npm, network, disk and processes - no AI call, no cost, right command for your shell.",
};

const p = docsPager("/docs/builtins");
const TOTAL = PACK_GROUPS.reduce((n, g) => n + g.rows.length, 0);

export default function Builtins() {
  return (
    <>
      <h1>Pre-built command packs</h1>
      <p>
        {TOTAL} curated developer commands that need no API key and make no
        LLM call. Run any pack <strong>directly by name</strong> (the{" "}
        <C>builtin</C> word is optional) and the correct variant for your
        detected shell/OS runs right away.
      </p>

      <Pre>
        <code>{`meero builtin                    # interactive grouped menu (auto shell detect)
meero status                     # short alias → runs git-status
meero git-status                 # full id, same thing, also works
meero kill-port 8080             # packs with params take args (else prompted)
meero whoport 3000               # who is hogging the port? (EADDRINUSE fixer)
meero doctor                     # node / npm / git / docker health check`}</code>
      </Pre>

      <h2>Smart auto-run</h2>
      <ul>
        <li><strong>Safe packs</strong> execute with no confirmation at all.</li>
        <li><strong>Risky packs</strong> (kill, discard, clean, stop, trash) ask once. They show what they touched: <C>git-discard</C> prints before/after status, <C>docker-stop</C> lists containers before and after, <C>kill-port</C> names the process it killed or tells you nothing was listening.</li>
        <li><strong>Empty targets never error</strong>. They say &quot;nothing to do&quot; and exit clean.</li>
        <li>If a command still fails, the normal <Link href="/docs/usage">AI self-repair loop</Link> offers a fix.</li>
      </ul>

      <Callout kind="info">
        Platform-aware by design: every pack ships variants for PowerShell /
        cmd / bash / zsh / sh (plus Windows, Linux, macOS specifics), and
        meero picks the one that matches the shell that will actually execute
        it. This is the same detection that powers AI generation.
      </Callout>

      {PACK_GROUPS.map(({ group, rows }) => (
        <section key={group}>
          <h2>{group}</h2>
          <table>
            <thead>
              <tr>
                <th>Copy-paste</th>
                <th>Short alias</th>
                <th>What it does</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <C>{`meero ${r.id}`}</C>
                    {r.args ? (
                      <span className="text-faint"> {r.args}</span>
                    ) : null}
                  </td>
                  <td>
                    <C>{`meero ${r.alias}`}</C>
                  </td>
                  <td>
                    {r.risky && <span className="mr-1 text-warn">!</span>}
                    {r.desc}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      <Pager prev={p.prev} next={p.next} />
    </>
  );
}
