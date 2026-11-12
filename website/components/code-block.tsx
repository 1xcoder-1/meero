"use client";

import { useState, type ReactNode } from "react";

/** Code block with a always-visible Copy button (used by <Pre> in docs) */
export function CodeBlock({ text, children }: { text: string; children: ReactNode }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="not-prose my-4 rounded-xl border border-white/10 bg-white/5">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-1.5">
        <span className="font-mono text-xs text-white/40">terminal</span>
        <button
          onClick={copy}
          className={`inline-flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1 text-xs transition-colors ${
            copied
              ? "bg-white/10 text-white"
              : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
          }`}
        >
          {copied ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect width="14" height="14" x="8" y="8" rx="2" />
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      <div className="overflow-x-auto scrollbar-none">
        <pre className="p-4 font-mono text-[13px] leading-relaxed whitespace-pre text-white/85 [&_code]:font-mono">
          {children}
        </pre>
      </div>
    </div>
  );
}
