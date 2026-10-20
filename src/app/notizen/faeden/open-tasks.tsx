"use client";

import { useState } from "react";
import Link from "next/link";
import { NoteLinkChip } from "@/components/note-link-chip";
import { setNoteTask } from "../actions";
import type { NoteLinkView } from "@/lib/notes";

export type TaskGroup = { noteId: string; title: string; links: NoteLinkView[]; tasks: { index: number; text: string }[] };

// Offene Aufgaben aller Notizen, nach Notiz gruppiert; Abhaken nimmt sie hier heraus und hakt sie in der Notiz ab.
export function OpenTasks({ groups: initial }: { groups: TaskGroup[] }) {
  const [groups, setGroups] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  // Gerade abgehakt (kurz durchgestrichen sichtbar, bevor sie verschwindet)
  const [done, setDone] = useState<Set<string>>(new Set());

  async function check(noteId: string, index: number) {
    const key = `${noteId}:${index}`;
    setError(null);
    setDone((cur) => new Set(cur).add(key));
    const err = await setNoteTask(noteId, index, true);
    if (err) {
      setDone((cur) => {
        const next = new Set(cur);
        next.delete(key);
        return next;
      });
      return setError(err);
    }
    window.setTimeout(() => {
      setGroups((cur) => cur.map((g) => (g.noteId === noteId ? { ...g, tasks: g.tasks.filter((t) => t.index !== index) } : g)).filter((g) => g.tasks.length > 0));
    }, 600);
  }

  if (groups.length === 0) return <p className="py-12 text-center text-sm text-muted">Keine offenen Fäden.</p>;

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {groups.map((g) => (
        <section key={g.noteId} className="rounded-2xl border border-line bg-surface px-4 py-3">
          <h2 className="mb-1 truncate text-[15px] font-semibold text-fg">
            <Link href={`/notizen/${g.noteId}`} className="hover:text-accent">
              {g.title}
            </Link>
          </h2>
          {g.links.length > 0 && (
            <div className="mb-1 flex flex-wrap gap-1.5">
              {g.links.slice(0, 5).map((l) => (
                <NoteLinkChip key={l.id} link={l} />
              ))}
            </div>
          )}
          <ul className="flex flex-col">
            {g.tasks.map((t) => {
              const checked = done.has(`${g.noteId}:${t.index}`);
              return (
                <li key={t.index}>
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-1 py-1.5 transition hover:bg-surface-2">
                    <input type="checkbox" checked={checked} onChange={() => void check(g.noteId, t.index)} className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-[var(--accent)]" />
                    <span className={`min-w-0 text-sm ${checked ? "text-muted line-through" : "text-fg"}`}>{t.text}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
