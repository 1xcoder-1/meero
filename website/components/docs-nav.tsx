"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOCS_SECTIONS } from "@/lib/docs";

export function DocsSidebar() {
  const pathname = usePathname();
  return (
    <nav className="space-y-6">
      {DOCS_SECTIONS.map((section) => (
        <div key={section.group}>
          <p className="mb-2 font-mono text-xs uppercase tracking-widest text-faint">
            {section.group}
          </p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active =
                item.href === "/docs"
                  ? pathname === "/docs"
                  : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                      active
                        ? "bg-brand/10 text-brand"
                        : "text-muted hover:bg-white/5 hover:text-fg"
                    }`}
                  >
                    {item.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
