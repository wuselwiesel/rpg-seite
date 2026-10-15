import Link from "next/link";

// Umschalter im Story-Bereich: Szenen oder die Liste aller Charaktere der Welt
export function StorySections({ current }: { current: "szenen" | "charaktere" }) {
  const items = [
    { key: "szenen", href: "/story", label: "Szenen" },
    { key: "charaktere", href: "/story/charaktere", label: "Charaktere" },
  ] as const;
  return (
    <div role="tablist" aria-label="Story-Bereich" className="mb-4 flex gap-1 rounded-xl bg-surface-2 p-1 text-sm font-medium">
      {items.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          role="tab"
          aria-selected={current === t.key}
          className={`flex flex-1 items-center justify-center rounded-lg px-3 py-1.5 transition ${current === t.key ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"}`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
