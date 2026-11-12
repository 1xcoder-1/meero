import type { Metadata } from "next";
import { Pre, C, Callout, Pager } from "@/components/md";
import { docsPager } from "@/lib/docs";

export const metadata: Metadata = {
  title: "Development & contributing",
  description:
    "Run meero from source, build the binaries, work on the CLI and the website, and understand how the project is laid out.",
};

const p = docsPager("/docs/development");

export default function Development() {
  return (
    <>
      <h1>Development &amp; contributing</h1>

      <h2>Repo layout</h2>
      <Pre>
        <code>{`meero/
├── index.ts              # CLI entry point (Commander) + execution loop
├── core/
│   ├── ai/
│   │   ├── system-prompt.ts   # AI system prompt & rules
│   │   ├── stream.ts          # local-first generation with cloud escalation
│   │   ├── run.ts             # LLM execution with Vercel AI SDK (usage tracking)
│   │   ├── tools.ts           # AI tools (file, git, shell, web, returnCommands)
│   │   ├── models.ts          # LLM models
│   │   ├── providers.ts       # provider configs + Ollama
│   │   └── usage.ts           # token usage + cost estimation
│   ├── cli/
│   │   ├── setup.ts           # interactive setup & reset
│   │   ├── config.ts          # config loader (~/.meero/config.json)
│   │   ├── run.ts             # live-streamed command capture
│   │   ├── safety.ts          # danger rules, gate, blast-radius hook
│   │   ├── snapshot.ts        # undo snapshots + preview engine
│   │   ├── history.ts         # task history store
│   │   ├── repair.ts          # AI self-repair prompt builder
│   │   ├── trust.ts           # trust levels + confirmations
│   │   ├── recipes.ts         # saved command sequences
│   │   ├── builtin.ts         # 60 pre-built command packs (no AI, auto shell detect)
│   │   ├── guardrail.ts       # casual-chat guardrail + meero-prefix strip
│   │   ├── router.ts          # slash → pack → meta → chat → AI decision order
│   │   ├── reference.ts       # /commands page, generated from the pack catalog
│   │   ├── clipboard.ts       # cross-platform copy
│   │   └── sandbox.ts         # Docker execution
│   └── input.ts               # input parsing & command normalization
├── website/                   # landing page + these docs (Next.js 16, Tailwind 4)
├── test/                      # bun test suite
├── assets/                    # icons (logo.svg is the single source of truth)
└── scripts/                   # installers, icon packaging, CI helpers`}</code>
      </Pre>

      <h2>Local development</h2>
      <p>Requires <a href="https://bun.sh">Bun</a>:</p>
      <Pre>
        <code>{`bun install
bun test              # unit tests
bunx tsc --noEmit     # strict typecheck`}</code>
      </Pre>

      <h2>The website</h2>
      <p>
        The landing page and these docs live in <C>website/</C>. It is a
        Next.js app that builds to plain static files, so it can be hosted
        anywhere:
      </p>
      <Pre>
        <code>{`cd website
npm install
npm run dev        # http://localhost:3000
npm run build      # static export -> out/
npm run lint`}</code>
      </Pre>

      <h2>Releases</h2>
      <p>
        Released binaries are built by GitHub Actions on every{" "}
        <C>v*</C> tag; the test job gates the build. The pipeline:
      </p>
      <Pre>
        <code>{`test gate → cross-compile (macOS arm64/x64, linux x64/arm64, windows x64)
        → icon/setup packaging (ico patch, .deb, .pkg, NSIS .exe)
        → GitHub release`}</code>
      </Pre>
      <p>
        The Windows exe is patched with the meero icon and version metadata
        (<C>scripts/patch-icon.mjs</C> + <C>rcedit</C>) before it is zipped
        or fed to NSIS; every branding asset is regenerated from{" "}
        <C>assets/logo.svg</C>.
      </p>

      <h2>Contributing</h2>
      <ol>
        <li>Fork the repository</li>
        <li>Create a feature branch (<C>git checkout -b feature/your-feature</C>)</li>
        <li>Make your changes, new logic needs tests</li>
        <li>Run <C>bun test</C> and <C>bunx tsc --noEmit</C></li>
        <li>Open a Pull Request</li>
      </ol>

      <Callout kind="ok">
        Adding a built-in pack automatically updates <C>meero /commands</C>{" "}, the reference page is generated from the real catalog, and a test
        proves the slash section names every route the CLI understands.
      </Callout>

      <Pager prev={p.prev} next={undefined} />
    </>
  );
}
