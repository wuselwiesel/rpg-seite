"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { collapseTrail, wikiTrail } from "@/lib/wiki-trail";
import type { FolderRow, PageRow } from "@/lib/wiki-tree";

// Pfad in der Wiki-Kopfzeile (ab Laptop): zeigt, wo man ist, und führt mit einem Klick zurück nach oben.
export function WikiBreadcrumbs({ folders, pages }: { folders: FolderRow[]; pages: PageRow[] }) {
  const pathname = usePathname();
  const items = collapseTrail(wikiTrail(pathname, folders, pages));

  return (
    <nav aria-label="Pfad" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-0.5 text-sm text-muted">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${i}-${c.label}`} className={`flex items-center gap-0.5 ${last ? "min-w-0" : "shrink-0"}`}>
              {i > 0 && <ChevronRight aria-hidden className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />}
              {c.href ? (
                <Link href={c.href} className="max-w-[12rem] truncate rounded px-1.5 py-1 transition hover:bg-surface-2 hover:text-accent">
                  {c.label}
                </Link>
              ) : (
                <span
                  title={c.hint ?? c.label}
                  aria-current={last ? "page" : undefined}
                  className={`max-w-[16rem] truncate px-1.5 py-1 ${last ? "font-medium text-fg" : ""}`}
                >
                  {c.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
