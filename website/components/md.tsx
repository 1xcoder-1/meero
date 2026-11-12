import type { ReactNode } from "react";
import Link from "next/link";
import { CodeBlock } from "./code-block";

function nodeText(n: ReactNode): string {
  if (typeof n === "string") return n;
  if (typeof n === "number") return String(n);
  if (Array.isArray(n)) return n.map(nodeText).join("");
  if (n && typeof n === "object" && "props" in n) {
    return nodeText((n as { props: { children?: ReactNode } }).props.children);
  }
  return "";
}

export function Pre({ children }: { children: ReactNode }) {
  return <CodeBlock text={nodeText(children).trim()}>{children}</CodeBlock>;
}

export function C({ children }: { children: ReactNode }) {
  return <code>{children}</code>;
}

export function Callout({
  kind = "info",
  children,
}: {
  kind?: "info" | "warn" | "danger" | "ok";
  children: ReactNode;
}) {
  const styles = {
    info: "border-brand/30 bg-brand/5 text-brand",
    warn: "border-warn/30 bg-warn/5 text-warn",
    danger: "border-danger/30 bg-danger/5 text-danger",
    ok: "border-ok/30 bg-ok/5 text-ok",
  }[kind];
  const icon = { info: "ℹ", warn: "!", danger: "⛔", ok: "✔" }[kind];
  return (
    <div className={`not-prose my-4 rounded-xl border ${styles} px-4 py-3`}>
      <div className="text-sm leading-relaxed text-muted">
        <span className={`mr-2 font-semibold ${styles.split(" ")[0].replace("border-", "text-")}`}>
          {icon}
        </span>
        {children}
      </div>
    </div>
  );
}

/** prev / next pager at the bottom of every docs page */
export function Pager({
  prev,
  next,
}: {
  prev?: { href: string; title: string; prevLabel?: string };
  next?: { href: string; title: string; nextLabel?: string };
}) {
  return (
    <div className="not-prose mt-12 flex items-center justify-between gap-4 border-t border-line pt-6">
      {prev ? (
        <Link
          href={prev.href}
          className="group flex flex-col rounded-xl border border-line bg-bg-soft px-4 py-3 hover:border-brand/40"
        >
          <span className="text-xs text-faint">← {prev.prevLabel ?? "Previous"}</span>
          <span className="text-sm font-medium text-fg group-hover:text-brand">{prev.title}</span>
        </Link>
      ) : <span />}
      {next ? (
        <Link
          href={next.href}
          className="group flex flex-col items-end rounded-xl border border-line bg-bg-soft px-4 py-3 text-right hover:border-brand/40"
        >
          <span className="text-xs text-faint">{next.nextLabel ?? "Next"} →</span>
          <span className="text-sm font-medium text-fg group-hover:text-brand">{next.title}</span>
        </Link>
      ) : <span />}
    </div>
  );
}
