import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type Crumb = { href: string; label: string };

// Pfad zur aktuellen Seite: Wiki › Ordner › Unterordner › Oberseite.
export function WikiCrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Pfad">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-sm text-muted">
        <li>
          <Link href="/wiki" className="rounded px-1 py-0.5 transition hover:text-accent">
            Wiki
          </Link>
        </li>
        {crumbs.map((c) => (
          <li key={c.href} className="flex items-center gap-1">
            <ChevronRight aria-hidden className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            <Link href={c.href} className="rounded px-1 py-0.5 transition hover:text-accent">
              {c.label}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}
