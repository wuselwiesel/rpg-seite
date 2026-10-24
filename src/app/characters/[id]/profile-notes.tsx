import Link from "next/link";
import { stripHtml } from "@/lib/strip-html";
import { TargetNotesButton } from "@/components/target-notes-button";

const dateLabel = (iso: string) => new Date(iso).toLocaleDateString("de-DE", { day: "numeric", month: "short" });

// Reiter „Notizen“ im eigenen Profil: Notizen, die mit diesem Charakter verknüpft sind. Links auf /notizen/… öffnen das Notizbuch-Fenster.
export function ProfileNotes({ notes, characterId, characterName }: { notes: { id: string; title: string; body: string; updatedAt: string }[]; characterId: string; characterName: string }) {
  return (
    <div className="flex flex-col gap-2 px-3 pb-24 pt-4 sm:px-0 lg:pb-10">
      {notes.map((n) => {
        const text = stripHtml(n.body).trim();
        return (
          <Link key={n.id} href={`/notizen/${n.id}`} className="rounded-xl border border-[#dccfb2] bg-[#fffcf3] px-4 py-3 text-[#3a2f24] transition hover:shadow-sm dark:border-line dark:bg-surface dark:text-fg">
            <span className="flex items-baseline gap-2">
              <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{n.title}</span>
              <span className="shrink-0 text-xs opacity-60">{dateLabel(n.updatedAt)}</span>
            </span>
            {text && <span className="mt-0.5 line-clamp-2 block text-sm opacity-75">{text}</span>}
          </Link>
        );
      })}
      {notes.length === 0 && <p className="py-6 text-center text-sm text-muted">Noch keine Notizen zu {characterName}.</p>}
      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
        <TargetNotesButton kind="character" targetId={characterId} targetLabel={characterName} count={notes.length} />
        <Link href="/notizen" className="rounded-full border border-line px-3 py-1.5 text-sm text-fg-soft transition hover:bg-surface-2 hover:text-fg">
          Ganzes Notizbuch
        </Link>
      </div>
    </div>
  );
}
