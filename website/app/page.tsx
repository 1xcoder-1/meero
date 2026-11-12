import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { InstallBox } from "@/components/install-box";
import { Terminal } from "@/components/terminal";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-24 sm:px-8">
      <Nav />

      <div className="pt-4 sm:pt-8">
        <div className="flex flex-col gap-4 text-base sm:text-lg">
          {/* announcement box */}
          <div className="rounded-lg border border-white/20 bg-white/10 px-4 py-4 text-white">
            <div className="font-bold">
              meero v1.7 now has 60 ready-made command packs
            </div>
            <div className="mt-1 text-sm text-white/70 sm:text-base">
              No AI and no cost for these. Type{" "}
              <code className="font-mono text-white/90">meero status</code> or{" "}
              <code className="font-mono text-white/90">meero kill-port 8080</code>{" "}
              and the right command for your shell runs at once.{" "}
              <Link href="/docs/builtins" className="text-white underline">
                See all packs →
              </Link>
            </div>
          </div>

          {/* hero sentence */}
          <h1 className="text-pretty text-white">
            <span className="font-bold">meero</span> turns plain English into
            shell commands on your machine.
          </h1>

          <div className="text-pretty text-white/70">
            Before meero, AI terminal tools were hard to set up. They ran
            commands you never reviewed, put your real files at risk, and never
            told you what a task would cost.
          </div>

          <div className="text-pretty text-white/70">Instead, meero:</div>

          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-white/70 marker:text-white/30">
            <li>Install once, then just say what you want in plain English</li>
            <li>Shows which files a command will touch before it runs</li>
            <li>
              Stops dangerous commands at a safety gate and backs everything
              up, so <code className="font-mono text-white/90">meero undo</code>{" "}
              always works
            </li>
            <li>
              Fixes failed commands by itself and prints the cost for every
              task
            </li>
          </ul>

          {/* what a real session looks like */}
          <div className="pt-2">
            <Terminal />
          </div>

          {/* install box */}
          <div>
            <span className="text-white">
              Run this command to get started:{" "}
              <Link
                href="/docs/installation"
                className="text-sm italic text-white/40 transition-colors hover:text-white/70 sm:text-base"
              >
                Prefer manual install?
              </Link>
            </span>
            <InstallBox />
            <p className="mt-3 text-sm text-white/50 sm:text-base">
              Then run{" "}
              <code className="font-mono text-white/80">meero setup</code>.
              Pick a provider, paste your key, and your terminal speaks
              English.
            </p>
          </div>

          {/* CTAs */}
          <div className="flex gap-3 pt-2">
            <a
              href="https://github.com/1xcoder-1/meero"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/90"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
              </svg>
              Star on GitHub
            </a>
            <Link
              href="/docs/commands"
              className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m4 17 6-6-6-6" />
                <path d="M12 19h8" />
              </svg>
              See all commands
            </Link>
          </div>

          {/* platforms strip */}
          <div className="pt-2">
            <div className="mb-3 text-sm text-white/50 sm:text-base">
              Runs on every machine you work on:
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-lg font-semibold text-white/40">
              <span>Windows</span>
              <span>macOS</span>
              <span>Linux</span>
            </div>
            <p className="mt-3 text-sm text-white/40">
              Works in PowerShell, cmd, bash, zsh and more. One install, no
              setup files, nothing to configure.{" "}
              <Link
                href="/docs/commands"
                className="text-white/70 underline transition-colors hover:text-white"
              >
                Every command is written down here →
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-16">
        <Footer />
      </div>
    </main>
  );
}
