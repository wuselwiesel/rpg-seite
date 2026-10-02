import Link from "next/link";
import { Folder } from "lucide-react";
import { WikiTile } from "@/components/wiki-tile";
import { WikiTypeBadge } from "@/components/wiki-type-icon";
import type { TreeFolder, TreePage } from "@/lib/wiki-tree";

const SPINES = ["bg-accent", "bg-accent-strong", "bg-chip"];

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

// Ordner als Karte: farbiger Rücken links, darin die ersten Artikel als Vorgeschmack.
export function FolderCard({ folder, index }: { folder: TreeFolder; index: number }) {
  const preview = folder.pages.slice(0, 3);
  const rest = folder.pages.length - preview.length;
  return (
    <Link
      href={`/wiki/ordner/${folder.id}`}
      className="group relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl border border-line bg-surface py-4 pl-6 pr-4 transition hover:border-accent/50 hover:bg-surface-2/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <span aria-hidden className={`absolute inset-y-0 left-0 w-2 ${SPINES[index % SPINES.length]}`} />
      <div className="flex items-start justify-between gap-3">
        <h3 className="flex min-w-0 items-center gap-2 font-serif text-2xl leading-tight text-fg">
          <Folder className="h-5 w-5 shrink-0 text-muted" strokeWidth={1.75} />
          <span className="truncate">{folder.name}</span>
        </h3>
        <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-fg-soft">{folder.total}</span>
      </div>
      {preview.length > 0 ? (
        <ul className="flex flex-col gap-0.5 text-sm text-fg-soft">
          {preview.map((p) => (
            <li key={p.id} className="truncate">
              {p.title}
            </li>
          ))}
          {rest > 0 && <li className="text-muted">und {rest} weitere</li>}
        </ul>
      ) : (
        <p className="text-sm text-muted">{folder.children.length > 0 ? "Nur Unterordner" : "Noch leer"}</p>
      )}
      {folder.children.length > 0 && (
        <p className="text-xs text-muted">{plural(folder.children.length, "Unterordner", "Unterordner")}</p>
      )}
    </Link>
  );
}

// Artikel als Karte mit Vorschaubild. Der ganze Rahmen ist anklickbar; Unterseiten sind eigene Links darüber.
export function PageCard({ page, showChildren = true }: { page: TreePage; showChildren?: boolean }) {
  const kids = showChildren ? page.children : [];
  return (
    <div className="group relative flex gap-4 rounded-2xl border border-line bg-surface p-3.5 transition focus-within:border-accent/50 hover:border-accent/50 hover:bg-surface-2/50">
      <WikiTile id={page.id} title={page.title} cover={page.cover_image_url} size="md" />
      <div className="min-w-0 flex-1">
        <Link
          href={`/wiki/${page.id}`}
          className="font-serif text-xl leading-snug text-fg after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-accent"
        >
          {page.title}
        </Link>
        {page.page_type && (
          <p className="mt-1">
            <WikiTypeBadge type={page.page_type} />
          </p>
        )}
        {page.lead && <p className="mt-0.5 line-clamp-2 text-sm text-fg-soft">{page.lead}</p>}
        {kids.length > 0 && (
          <ul className="relative z-10 mt-2 flex flex-wrap gap-1.5">
            {kids.slice(0, 4).map((c) => (
              <li key={c.id}>
                <Link
                  href={`/wiki/${c.id}`}
                  className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-fg-soft transition hover:text-accent"
                >
                  {c.title}
                </Link>
              </li>
            ))}
            {kids.length > 4 && <li className="px-1 py-0.5 text-xs text-muted">+{kids.length - 4}</li>}
          </ul>
        )}
      </div>
    </div>
  );
}
