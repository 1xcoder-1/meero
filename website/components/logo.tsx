import Link from "next/link";

/** The meero mark, inlined from assets/logo.svg so it scales razor-sharp anywhere */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      aria-label="meero logo"
      role="img"
    >
      <rect x="32" y="32" width="960" height="960" rx="232" fill="#16181D" />
      <rect
        x="32"
        y="32"
        width="960"
        height="960"
        rx="232"
        fill="none"
        stroke="#2A2E38"
        strokeWidth="8"
      />
      <polyline
        points="336,344 552,512 336,680"
        fill="none"
        stroke="#5EEAD4"
        strokeWidth="104"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="592"
        y1="680"
        x2="712"
        y2="680"
        stroke="#5EEAD4"
        strokeWidth="104"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2.5 group">
      <LogoMark size={26} />
      <span className="font-mono text-[17px] font-semibold tracking-tight text-fg group-hover:text-brand transition-colors">
        meero
      </span>
    </Link>
  );
}
