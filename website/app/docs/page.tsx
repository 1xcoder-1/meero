import type { Metadata } from "next";
import Link from "next/link";
import { Pre, C, Callout, Pager } from "@/components/md";
import { docsPager } from "@/lib/docs";

export const metadata: Metadata = {
  // absolute: this page sits in the same segment as the docs layout, so the
  // layout title template does not apply to it — set the full title by hand.
  title: { absolute: "Introduction | Docs | meero" },
  description:
    "What meero is: plain English in, reviewed shell commands out. System inspection, a safety gate, undo snapshots, self-repair and a cost line on every task.",
};

const p = docsPager("/docs");

export default function DocsHome() {
  return (
    <>
      <h1>Introduction</h1>
      <p>
        <strong>meero</strong> is an AI-powered CLI that turns plain English
        into shell commands. Just say what you want to do. meero looks at your
        system, makes the commands, blocks the dangerous ones, runs them only
        after you say yes, and fixes itself when something fails.
      </p>
      <Pre>
        <code>{`$ meero commit all my changes
$ meero delete all .tmp files in the project
$ meero what is the command to initialise a vite project`}</code>
      </Pre>

      <h2>What makes meero different</h2>
      <ul>
        <li><strong>Shell-aware</strong>. It finds your exact shell (PowerShell 7, Windows PowerShell 5.1, cmd.exe, bash, zsh, sh) and only makes commands that shell can actually run.</li>
        <li><strong>Safe by default</strong>. A rules layer, a file preview and a red <em>safety gate</em> stand between the AI and your machine.</li>
        <li><strong>Reversible</strong>. Every task that changes files makes a backup first, and <C>meero undo</C> puts things back.</li>
        <li><strong>Self-repairing</strong>. When a command fails, the AI sees the real output and fixes the remaining steps (up to 3 rounds).</li>
        <li><strong>Free for the everyday stuff</strong>. 60 ready-made command packs (git, docker, npm, network, disk, processes) run with no AI and no cost.</li>
        <li><strong>Clear about cost</strong>. Every task prints the tokens used and the rough dollar cost.</li>
        <li><strong>Not a chatbot</strong>. Casual one-liners never reach the AI, and the AI may only answer with shell commands.</li>
      </ul>

      <Callout kind="info">
        meero can run a single task or start interactive mode for multi-step work. Casual chat is not supported and nothing to
        exit. Typing <C>meero</C> alone shows the help box.
      </Callout>

      <h2>How a task flows</h2>
      <ol>
        <li>Your request goes to the AI together with live details about your system.</li>
        <li>The AI looks at files, searches the web if needed, and returns the commands.</li>
        <li>You see the commands in a box with a cost line (tokens and rough $).</li>
        <li>You say yes, or edit the list right there, before anything runs.</li>
        <li>The commands run one by one. If one fails, the AI sees the real output and fixes the rest.</li>
        <li>Files that would be changed are backed up first, so <C>meero undo</C> can bring them back.</li>
      </ol>

      <h2>Where to go next</h2>
      <ul>
        <li>New here? <Link href="/docs/installation">Install meero</Link> and run the <Link href="/docs/quickstart">quickstart</Link>.</li>
        <li>Already installed? Browse <Link href="/docs/builtins">the 60 command packs</Link>. They need no API key at all.</li>
        <li>Curious how the AI is constrained? Read <Link href="/docs/how-it-works">How it works</Link>.</li>
      </ul>

      <Pager prev={p.prev} next={p.next} />
    </>
  );
}
