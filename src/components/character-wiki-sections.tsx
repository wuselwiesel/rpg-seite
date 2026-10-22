import Link from "next/link";
import { BookOpen, ScrollText } from "lucide-react";
import { CharacterAvatar } from "@/components/character-avatar";
import type { PersonCard, SceneItem, TimelineItem } from "@/lib/character-wiki-data";
import { formatDateTime } from "@/lib/format";

const head = "mb-4 flex items-baseline gap-2 font-serif text-2xl text-fg";

// Karten mit Bild und Name; führen zur Wiki-Seite der Figur, sonst zu ihrem Profil
export function PersonCards({ id, title, people }: { id: string; title: string; people: PersonCard[] }) {
  if (people.length === 0) return null;
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className={head}>
        {title} <span className="text-base text-muted">{people.length}</span>
      </h2>
      <ul className="grid grid-cols-1 gap-3 @xl:grid-cols-2 @3xl:grid-cols-3">
        {people.map((p) => (
          <li key={`${p.id}-${p.note ?? ""}`}>
            <Link
              href={p.wikiId ? `/wiki/${p.wikiId}` : `/characters/${p.id}`}
              className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 transition hover:bg-surface-2"
              style={p.color ? { borderLeft: `4px solid ${p.color}` } : undefined}
            >
              <CharacterAvatar name={p.name} avatarUrl={p.avatarUrl} size={44} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-fg">{p.name}</span>
                {p.note && <span className="block truncate text-xs text-muted">{p.note}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function RecentScenes({ scenes, total }: { scenes: SceneItem[]; total: number }) {
  if (scenes.length === 0) return null;
  return (
    <section aria-labelledby="letzte-szenen">
      <h2 id="letzte-szenen" className={head}>
        Letzte Szenen <span className="text-base text-muted">{total}</span>
      </h2>
      <ul className="flex flex-col gap-1.5">
        {scenes.map((s) => (
          <li key={s.id}>
            <Link href={`/story/${s.id}`} className="flex items-baseline gap-2 text-fg-soft transition hover:text-accent">
              <BookOpen className="h-3.5 w-3.5 shrink-0 self-center text-muted" strokeWidth={2} />
              <span className="min-w-0 truncate">{s.title}</span>
              <span className="shrink-0 text-xs text-muted">
                {s.count} {s.count === 1 ? "Beitrag" : "Beiträge"} · {s.dateLabel ?? formatDateTime(s.at)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CharacterTimeline({ items }: { items: TimelineItem[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="zeitstrahl">
      <h2 id="zeitstrahl" className={head}>
        Zeitstrahl <span className="text-base text-muted">{items.length}</span>
      </h2>
      <ol className="flex flex-col gap-2 border-l border-line pl-4">
        {items.map((t) => (
          <li key={`${t.kind}-${t.href}`} className="relative">
            <span className="absolute -left-[1.4rem] top-1.5 h-2 w-2 rounded-full bg-accent-strong" aria-hidden />
            <Link href={t.href} className="flex items-baseline gap-2 text-fg-soft transition hover:text-accent">
              <span className="w-24 shrink-0 text-xs text-muted">{t.label}</span>
              {t.kind === "wiki" ? <ScrollText className="h-3.5 w-3.5 shrink-0 self-center text-muted" strokeWidth={2} /> : <BookOpen className="h-3.5 w-3.5 shrink-0 self-center text-muted" strokeWidth={2} />}
              <span className="min-w-0 truncate">{t.title}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
