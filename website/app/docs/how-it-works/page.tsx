import type { Metadata } from "next";
import { Pre, C, Callout, Pager } from "@/components/md";
import { docsPager } from "@/lib/docs";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "What happens inside meero when you type a task: inspection, prompt building, the AI call, safety checks, execution and the self-repair loop.",
};

const p = docsPager("/docs/how-it-works");

export default function HowItWorks() {
  return (
    <>
      <h1>How it works</h1>

      <h2>System prompt &amp; the three modes</h2>
      <p>
        meero uses a structured system prompt so the AI chooses the right mode
        for each developer request:
      </p>
      <table>
        <thead>
          <tr><th>Mode</th><th>When used</th></tr>
        </thead>
        <tbody>
          <tr><td><strong>Tool Mode</strong></td><td>Task depends on real file contents, paths, or git state</td></tr>
          <tr><td><strong>Web Mode</strong></td><td>Task requires live docs, package info, or an unfamiliar command</td></tr>
          <tr><td><strong>Direct Mode</strong></td><td>Task is a well-known generic command, no inspection needed</td></tr>
        </tbody>
      </table>
      <p>
        The AI is instructed to never assume files exist, never hallucinate
        CLI flags, generate commit messages from the actual diff, and return
        commands only through the structured <C>returnCommands</C> tool.
      </p>

      <h2>System tools</h2>
      <table>
        <thead>
          <tr><th>Tool</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><C>cwd</C></td><td>Get current working directory</td></tr>
          <tr><td><C>os</C></td><td>Get OS platform and architecture</td></tr>
          <tr><td><C>env</C></td><td>List environment variable names</td></tr>
          <tr><td><C>listFiles</C></td><td>List files in a directory with metadata</td></tr>
          <tr><td><C>readFile</C></td><td>Read file content (first 3000 chars; credential files are refused)</td></tr>
          <tr><td><C>readFileLines</C></td><td>Read specific lines from a file</td></tr>
          <tr><td><C>fileExists</C></td><td>Check if a file or directory exists</td></tr>
          <tr><td><C>gitStatus</C></td><td>Get git status (short format)</td></tr>
          <tr><td><C>gitDiff</C></td><td>Get full git diff</td></tr>
          <tr><td><C>searchFiles</C></td><td>Search text across files (grep / Select-String / findstr per OS)</td></tr>
          <tr><td><C>returnCommands</C></td><td>Return the final command list structurally</td></tr>
        </tbody>
      </table>

      <h2>Web tools</h2>
      <table>
        <thead>
          <tr><th>Tool</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><C>webSearch</C></td><td>Search the web; returns titles, URLs, snippets and parsed page text</td></tr>
          <tr><td><C>fetchWebPage</C></td><td>Fetch and parse a URL into clean readable text</td></tr>
        </tbody>
      </table>

      <h2>The execution loop</h2>
      <Pre>
        <code>{`task
  -> router (slash, then pack, then meta, then chat guardrail, then AI)
  -> generate (local-first if cheap mode, live streaming)
  -> parse + normalize commands
  -> show box + cost line
  -> confirm / modify / decline
  -> safety gate -> snapshot -> run sequentially
  -> on failure: real output -> AI repair (up to 3 rounds)
  -> history (plus a recipe save offer for multi-command wins)`}</code>
      </Pre>

      <h2>Cost transparency</h2>
      <p>
        Token usage is tracked per run through the Vercel AI SDK and printed
        with every task:
      </p>
      <Pre>
        <code>{`↻ 1.4k in · 96 out · gemini-2.5-flash · ≈ $0.0004`}</code>
      </Pre>

      <Callout kind="info">
        The guardrail is two-sided: casual chat never reaches the model, and
        when the model <em>is</em> used it is locked to shell commands, it
        can never chat back.
      </Callout>

      <Pager prev={p.prev} next={p.next} />
    </>
  );
}
