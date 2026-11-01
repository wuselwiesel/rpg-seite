import type { TocItem } from "@/lib/wiki-toc";

function List({ items }: { items: TocItem[] }) {
  return (
    <ol className="flex flex-col gap-1.5 border-l border-line pl-3">
      {items.map((h) => (
        <li key={h.id} className={h.level === 3 ? "pl-3" : ""}>
          <a href={`#${h.id}`} className="text-muted transition hover:text-accent">
            {h.number && <span className="mr-1.5 tabular-nums text-muted/70">{h.number}</span>}
            {h.text}
          </a>
        </li>
      ))}
    </ol>
  );
}

// Inhaltsverzeichnis: „side“ = rechte Spalte (nur breit), „mobile“ = Aufklappfeld über dem Text (nur schmal),
// „top“ = Aufklappfeld über dem Text (immer, geöffnet).
export function WikiTocNav({ items, title, variant }: { items: TocItem[]; title: string; variant: "side" | "mobile" | "top" }) {
  if (variant === "side") {
    return (
      <nav aria-label={title} className="hidden text-sm @3xl:block">
        <p className="mb-2 font-serif text-lg text-fg">{title}</p>
        <List items={items} />
      </nav>
    );
  }
  return (
    <details open={variant === "top"} className={`rounded-xl border border-line bg-surface px-4 py-3 text-sm ${variant === "mobile" ? "@3xl:hidden" : ""}`}>
      <summary className="cursor-pointer select-none font-serif text-lg text-fg">{title}</summary>
      <nav aria-label={title} className="mt-2">
        <List items={items} />
      </nav>
    </details>
  );
}
