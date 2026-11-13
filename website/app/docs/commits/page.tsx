import type { Metadata } from "next";
import Link from "next/link";
import { Pre, C, Callout, Pager } from "@/components/md";
import { docsPager } from "@/lib/docs";

export const metadata: Metadata = {
  title: "AI commits",
  description:
    "meero commit makes a fresh commit with an AI-written message from your staged changes; meero recommit rewrites the messages of your past commits. No git commands to remember.",
};

const p = docsPager("/docs/commits");

export default function Commits() {
  return (
    <>
      <h1>AI commits</h1>
      <p>
        Two short commands, no <C>git</C> typing. Both only run inside a git
        repository and redact secrets (env files, keys, tokens) before anything
        is sent to the AI provider.
      </p>

      <h2>Fresh commit: <C>meero commit</C></h2>
      <p>
        Writes the commit message from your <strong>staged changes</strong>,
        shows it, and commits after you confirm. If nothing is staged, meero
        offers to stage all changes. It works on a brand-new repository with
        zero commits too — perfect for the very first commit.
      </p>
      <Pre>
        <code>{`meero commit              # AI message from staged changes → confirm → commit
meero commit -a           # stage all changes automatically
meero commit -m "my msg"  # skip the AI, use your own message
meero commit -t "(feat): message"   # custom format`}</code>
      </Pre>
      <p>
        Before committing you can pick <em>Edit it</em> to tweak the AI message.
        The cost line (tokens + $) prints under the generated message.
      </p>

      <h2>Rewrite history: <C>meero recommit</C></h2>
      <p>
        Walks your commit history, scores every message (conventional format,
        length, genericness), skips the ones that already look good, and
        proposes AI-rewritten <code>old → new</code> messages for the rest. You
        confirm once, meero creates a <strong>backup branch</strong>, then
        rewrites the history with <code>git filter-branch</code>.
      </p>
      <Pre>
        <code>{`meero recommit                  # score + rewrite the whole branch
meero recommit --dry-run        # preview old → new, change nothing
meero recommit -n 10            # only the last 10 commits
meero recommit --all            # rewrite even well-formed messages
meero recommit -t "(feat): message" -l en   # format + language`}</code>
      </Pre>
      <Callout kind="warn">
        Rewriting history changes commit hashes. Never do it on branches others
        have pulled — if you already pushed, you will need a force push
        (<C>--force-with-lease</C>). A backup branch is always created; restore
        with <C>git reset --hard &lt;backup&gt;</C>.
      </Callout>

      <h2>Slash forms</h2>
      <Pre>
        <code>{`meero /commit         # same as meero commit
meero /recommit       # same as meero recommit`}</code>
      </Pre>

      <h2>Example</h2>
      <Pre>
        <code>{`$ meero recommit -n 5
↺ meero recommit — 5 commit(s) on main
  20% ✓ a1b2c3d4 already good (10/10) — "feat(api): add pagination"
  40% ↻ e5f6a7b8 "update stuff" (not conventional format, too generic)
        ✨ → "fix(auth): handle null token on expired sessions"
  …
📋 1 message(s) to rewrite:
  update stuff  →  fix(auth): handle null token on expired sessions

Apply these new messages (rewrites history)? › No`}</code>
      </Pre>

      <Pager prev={p.prev} next={p.next} />
    </>
  );
}
