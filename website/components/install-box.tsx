"use client";

import { useState } from "react";

const TABS = [
  {
    id: "macos-linux",
    label: "macOS / Linux",
    cmd: "curl -fsSL https://raw.githubusercontent.com/1xcoder-1/meero/main/scripts/install.sh | bash",
  },
  {
    id: "windows",
    label: "Windows",
    cmd: "iwr https://raw.githubusercontent.com/1xcoder-1/meero/main/scripts/install.ps1 -useb | iex",
  },
  {
    id: "deb",
    label: "Debian / Ubuntu",
    cmd: "ARCH=$(dpkg --print-architecture | sed 's/amd64/x64/'); curl -fsSL https://github.com/1xcoder-1/meero/releases/latest/download/meero-linux-$ARCH.deb -o /tmp/meero.deb && sudo apt install -y /tmp/meero.deb",
  },
  {
    id: "pkg",
    label: "macOS pkg",
    cmd: "ARCH=$(uname -m | sed 's/x86_64/x64/'); curl -fsSL https://github.com/1xcoder-1/meero/releases/latest/download/meero-macos-$ARCH.pkg -o /tmp/meero.pkg && sudo installer -pkg /tmp/meero.pkg -target /",
  },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function InstallBox() {
  const [active, setActive] = useState<TabId>("macos-linux");
  const [copied, setCopied] = useState(false);
  const tab = TABS.find((t) => t.id === active)!;

  async function copy() {
    try {
      await navigator.clipboard.writeText(tab.cmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-white/10 bg-white/5 text-white shadow-[0_8px_30px_rgb(0,0,0,0.3)]">
      <div className="flex gap-4 overflow-x-auto px-4 pt-3 scrollbar-none sm:gap-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`shrink-0 whitespace-nowrap border-b pb-2 font-sans text-sm transition-colors sm:text-base ${
              t.id === active
                ? "border-white text-white"
                : "border-transparent text-white/50 hover:text-white/80"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-4 px-4 py-5">
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-pre text-left font-mono text-sm leading-relaxed text-white/85 scrollbar-none sm:text-base">
          {tab.cmd}
        </code>
        <button
          onClick={copy}
          title={copied ? "Copied" : "Copy command"}
          aria-label={copied ? "Copied" : "Copy command"}
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center self-center rounded-md border transition-colors ${
            copied
              ? "border-white/20 bg-white/15 text-white"
              : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
          }`}
        >
          {copied ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="20 6 9 17l-5-5" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect width="14" height="14" x="8" y="8" rx="2" />
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
