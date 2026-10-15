import Link from "next/link";

// Ohne Charakter in der Welt: erkunden ist erlaubt, mitmachen braucht einen Charakter oder eine freie Rolle
export function NoCharacterBanner({ worldId, className = "" }: { worldId: string; className?: string }) {
  return (
    <div role="note" className={`flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 ${className}`}>
      <p className="text-sm text-fg">
        Du schaust dich gerade ohne Charakter um. Zum Mitschreiben, Liken und Chatten legst du einen Charakter an oder fragst eine freie Rolle an.
      </p>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/characters/new?welcome=1"
          className="rounded-full bg-accent-strong px-4 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90"
        >
          Charakter anlegen
        </Link>
        <Link
          href={`/worlds/${worldId}`}
          className="rounded-full border border-line px-4 py-1.5 text-sm font-medium text-fg-soft transition hover:border-accent hover:text-accent"
        >
          Freie Rollen ansehen
        </Link>
      </div>
    </div>
  );
}
