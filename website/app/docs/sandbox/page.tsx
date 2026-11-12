import type { Metadata } from "next";
import { Pre, C, Callout, Pager } from "@/components/md";
import { docsPager } from "@/lib/docs";

export const metadata: Metadata = {
  title: "Sandbox (Docker)",
  description:
    "Run meero commands inside a throwaway Docker container. Your machine stays untouched; meero needs a working Docker daemon and never falls back silently.",
};

const p = docsPager("/docs/sandbox");

export default function Sandbox() {
  return (
    <>
      <h1>Sandbox (Docker)</h1>
      <p>
        Run generated commands inside a throwaway Docker container. Your
        machine stays untouched. It is experimental, but it is the safest way
        to try a risky plan.
      </p>

      <Pre>
        <code>{`meero --sandbox find large files over 100mb
meero --sandbox ubuntu:24.04 install nginx
meero run cleanup --sandbox             # recipes sandbox too`}</code>
      </Pre>

      <h2>How it works</h2>
      <ul>
        <li>Default image: <C>alpine:latest</C>, pass any image name after the flag.</li>
        <li>Inside the container the executor is POSIX <C>sh</C>, <em>whatever your host shell is</em>, meero swaps the system prompt so the AI generates <C>sh</C> syntax for sandboxed tasks.</li>
        <li>Each command runs via <C>docker run</C> against the chosen image; output streams back to your terminal.</li>
        <li>Self-repair works the same way: a failed sandboxed command is fed back and fixed within the same container context.</li>
      </ul>

      <Callout kind="warn">
        <C>--sandbox</C> needs a working Docker daemon. If it can&apos;t
        reach one, meero stops with a clear message naming the image it
        tried. It never silently falls back to running on your host.
      </Callout>

      <Pre>
        <code>{`$ meero --sandbox echo hi
✖ --sandbox needs a working docker daemon (tried image "alpine:latest").
  Start Docker or drop the flag.`}</code>
      </Pre>

      <Pager prev={p.prev} next={p.next} />
    </>
  );
}
