import Link from "next/link";
import { LogoMark } from "./logo";

export function Footer() {
  return (
    <footer className="border-t border-line/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-5 py-10 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-3">
          <LogoMark size={22} />
          <span className="text-sm text-faint">
            MIT © <a href="https://github.com/1xcoder-1" className="hover:text-muted">1xcoder</a>
          </span>
        </div>
        <div className="flex items-center gap-6 text-sm text-faint">
          <Link href="/docs" className="hover:text-muted">Docs</Link>
          <a href="https://github.com/1xcoder-1/meero" className="hover:text-muted">GitHub</a>
          <a href="https://github.com/1xcoder-1/meero/releases" className="hover:text-muted">Releases</a>
          <a href="https://github.com/1xcoder-1/meero/issues" className="hover:text-muted">Issues</a>
        </div>
      </div>
    </footer>
  );
}
