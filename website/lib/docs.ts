export const DOCS_SECTIONS: {
  group: string;
  items: { href: string; title: string }[];
}[] = [
  {
    group: "Getting started",
    items: [
      { href: "/docs", title: "Introduction" },
      { href: "/docs/installation", title: "Installation" },
      { href: "/docs/quickstart", title: "Quickstart" },
      { href: "/docs/configuration", title: "Configuration" },
    ],
  },
  {
    group: "Using meero",
    items: [
      { href: "/docs/commands", title: "All commands" },
      { href: "/docs/usage", title: "Usage & workflow" },
      { href: "/docs/slash-commands", title: "Slash commands" },
      { href: "/docs/reference", title: "Commands & flags" },
      { href: "/docs/builtins", title: "Pre-built command packs" },
      { href: "/docs/commits", title: "AI commits" },
      { href: "/docs/recipes", title: "Recipes" },
      { href: "/docs/safety", title: "Safety, trust & undo" },
      { href: "/docs/history", title: "Task history" },
      { href: "/docs/cheap-mode", title: "Cheap mode (Ollama)" },
      { href: "/docs/sandbox", title: "Sandbox (Docker)" },
    ],
  },
  {
    group: "Under the hood",
    items: [{ href: "/docs/how-it-works", title: "How it works" }],
  },
  {
    group: "Project",
    items: [{ href: "/docs/development", title: "Development & contributing" }],
  },
];

/** flat order for the prev/next pager */
export const DOCS_ORDER = DOCS_SECTIONS.flatMap((s) => s.items);

export function docsPager(pathname: string) {
  const i = DOCS_ORDER.findIndex((d) => d.href === pathname);
  return {
    prev: i > 0 ? DOCS_ORDER[i - 1] : undefined,
    next: i >= 0 && i < DOCS_ORDER.length - 1 ? DOCS_ORDER[i + 1] : undefined,
  };
}
