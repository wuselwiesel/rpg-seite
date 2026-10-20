import Link from "next/link";

export type NotesTab = "notizen" | "faeden";

// Reiter über dem Notizbuch: Notizen · Offene Fäden (Zahl der offenen Aufgaben)
export function NotesTabs({ active, openCount }: { active: NotesTab; openCount: number }) {
  const tab = (on: boolean) => `flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition ${on ? "bg-accent-strong text-on-accent-strong" : "bg-surface-2 text-fg-soft hover:text-fg"}`;
  return (
    <nav aria-label="Notizbuch" className="mb-5 flex gap-2">
      <Link href="/notizen" aria-current={active === "notizen" ? "page" : undefined} className={tab(active === "notizen")}>
        Notizen
      </Link>
      <Link href="/notizen/faeden" aria-current={active === "faeden" ? "page" : undefined} className={tab(active === "faeden")}>
        Offene Fäden
        {openCount > 0 && <span className="text-xs tabular-nums opacity-75">{openCount}</span>}
      </Link>
    </nav>
  );
}
