import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { DocsSidebar } from "@/components/docs-nav";

export const metadata: Metadata = {
  title: { default: "Docs", template: "%s | Docs | meero" },
  description:
    "Everything meero can do: installation, natural-language tasks, safety gate, undo, command packs, recipes, trust levels and more.",
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-8">
      {/* nav sits inside the same centered column as the content */}
      <div className="pt-10 sm:pt-14">
        <Nav />
      </div>
      <div className="flex">
        {/* sidebar: sticky on desktop, collapsible on mobile */}
        <aside className="hidden w-60 shrink-0 border-r border-white/10 py-10 pr-6 lg:block">
          <div className="sticky top-10 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2">
            <DocsSidebar />
          </div>
        </aside>
        <div className="min-w-0 flex-1 py-10 lg:pl-10">
          <details className="mb-6 rounded-lg border border-white/10 bg-white/5 p-3 lg:hidden">
            <summary className="cursor-pointer text-sm font-medium text-white/60">
              Docs navigation
            </summary>
            <div className="mt-3">
              <DocsSidebar />
            </div>
          </details>
          <div className="prose-meero max-w-3xl">{children}</div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
