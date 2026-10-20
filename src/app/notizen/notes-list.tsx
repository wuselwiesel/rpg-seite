"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pin, Plus, Search } from "lucide-react";
import { NoteLinkChip } from "@/components/note-link-chip";
import { createNote } from "./actions";
import { noteMatches, noteSnippet, noteTitle, type NoteView } from "@/lib/notes";

const dayFormat = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Berlin" });

export function NotesList({ notes }: { notes: NoteView[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const shown = useMemo(() => notes.filter((n) => noteMatches(n, q)), [notes, q]);

  function add() {
    setError(null);
    start(async () => {
      const r = await createNote();
      if (r.error || !r.id) setError(r.error ?? "Konnte nicht angelegt werden.");
      else router.push(`/notizen/${r.id}`);
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="font-serif text-3xl text-fg">Notizen</h1>
        <button type="button" onClick={add} disabled={pending} className="flex items-center gap-1.5 rounded-full bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-60">
          <Plus className="h-4 w-4" strokeWidth={2.25} />
          Neue Notiz
        </button>
      </div>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {notes.length > 0 && (
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={2} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="In Notizen suchen" className="w-full rounded-full border border-line bg-surface py-2.5 pl-10 pr-4 text-sm text-fg outline-none focus:border-accent" />
        </div>
      )}
      {notes.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted">Noch keine Notizen.</p>
      ) : shown.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted">Nichts gefunden.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((n) => (
            <li key={n.id} className="rounded-2xl border border-line bg-surface transition hover:border-accent/40">
              <Link href={`/notizen/${n.id}`} className="block px-4 pt-3.5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="min-w-0 truncate text-[15px] font-semibold text-fg">{noteTitle(n)}</h2>
                  <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted">
                    {n.pinned && <Pin className="h-3 w-3 text-accent" strokeWidth={2.25} aria-label="Angeheftet" />}
                    {dayFormat.format(new Date(n.updatedAt))}
                  </span>
                </div>
                {n.title.trim() && noteSnippet(n.body) && <p className="mt-1 line-clamp-2 text-sm text-fg-soft">{noteSnippet(n.body)}</p>}
              </Link>
              {n.links.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 px-4 pb-3.5 pt-2.5">
                  {n.links.slice(0, 6).map((l) => (
                    <NoteLinkChip key={l.id} link={l} />
                  ))}
                  {n.links.length > 6 && <span className="self-center text-xs text-muted">+{n.links.length - 6}</span>}
                </div>
              ) : (
                <div className="pb-3.5" />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
