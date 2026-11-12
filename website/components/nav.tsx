import Link from "next/link";
import { LogoMark } from "./logo";

/** react-scan.com nav: plain row inside the content column, logo left, underlined text links right */
export function Nav() {
  return (
    <nav className="relative flex items-center justify-between text-base sm:text-lg">
      <Link
        href="/"
        className="flex items-center gap-3 text-inherit no-underline"
        aria-label="meero home"
      >
        <LogoMark size={40} />
      </Link>
      <div className="flex gap-3 text-sm sm:gap-4 sm:text-base">
        <Link
          href="/docs/commands"
          className="text-white/50 underline transition-colors hover:text-white"
        >
          docs
        </Link>
        <a
          href="https://github.com/1xcoder-1/meero"
          target="_blank"
          rel="noreferrer"
          className="text-white/50 underline transition-colors hover:text-white"
        >
          github
        </a>
      </div>
    </nav>
  );
}
