/** Static terminal mock for the hero, a real-shaped meero session */
export function Terminal() {
  return (
    <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-xl border border-line bg-[#0d0d10] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_24px_80px_-24px_rgba(0,0,0,0.8)]">
      {/* title bar */}
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        <span className="ml-3 font-mono text-xs text-faint">
          pwsh, meero
        </span>
      </div>
      <div className="space-y-1 p-5 font-mono text-[13px] leading-relaxed">
        <p>
          <span className="text-brand">$ </span>
          <span className="text-fg">meero delete all .tmp files in the project</span>
        </p>
        <p className="text-faint">
          ⚡ shell: Windows PowerShell 5.1 · inspecting 214 files…
        </p>
        <p className="text-cyan-300">1. Get-ChildItem -Recurse -Filter *.tmp | Remove-Item</p>
        <p className="text-faint">
          ↻ 1.4k in · 96 out · gemini-2.5-flash · ≈ $0.0004
        </p>
        <p className="text-faint">? Execute these commands? › Yes</p>
        <p className="text-fg">
          <span className="text-brand">→ </span>Get-ChildItem -Recurse -Filter *.tmp | Remove-Item
        </p>
        <p className="text-faint">↺ Snapshot 9f3c2a, revert: meero undo</p>
        <p className="text-ok">✔ done</p>
        <p className="pt-2">
          <span className="text-brand">$ </span>
          <span className="text-fg">meero rm -rf ~/ --trust high</span>
        </p>
        <div className="my-1 rounded-md border border-danger/50 bg-danger/5 p-3">
          <p className="text-danger">⛔ SAFETY GATE, destructive command detected</p>
          <p className="text-muted">
            blast radius: 41,882 files · 63.2 GB (entire home directory)
          </p>
          <p className="text-muted">
            type <span className="text-danger font-semibold">confirm</span> to proceed -{" "}
            <span className="text-faint">anything else aborts</span>
          </p>
        </div>
        <p>
          <span className="text-brand">$ </span>
          <span className="text-fg inline-block h-4 w-2 translate-y-0.5 animate-pulse bg-brand" />
        </p>
      </div>
    </div>
  );
}
