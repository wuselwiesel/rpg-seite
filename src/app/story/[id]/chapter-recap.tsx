"use client";

import { useState, useTransition } from "react";
import { ChevronDown, NotebookPen } from "lucide-react";
import { setChapterRecap } from "../actions";
import { formatDateTime } from "@/lib/format";

// Selbst geschriebene Zusammenfassung eines Kapitels: unter der Kapitelüberschrift zum Aufklappen, von allen Mitspielenden schreib- und änderbar.
export function ChapterRecap({
  storyPostId,
  entryId,
  recap,
  recapAt,
  closed,
}: {
  storyPostId: string;
  entryId: string;
  recap: string | null;
  recapAt: string | null;
  // Das Kapitel ist abgeschlossen, sobald ein weiteres begonnen wurde.
  closed: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(recap ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save(value: string) {
    setError(null);
    start(async () => {
      const err = await setChapterRecap(storyPostId, entryId, value);
      if (err) return setError(err);
      setEditing(false);
      if (value.trim()) setOpen(true);
    });
  }

  if (editing) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save(text);
        }}
        className="mx-auto mt-3 flex max-w-xl flex-col gap-2 text-left"
      >
        <label className="text-xs text-muted" htmlFor={`recap-${entryId}`}>
          Zusammenfassung dieses Kapitels (für alle zum Nachlesen)
        </label>
        <textarea
          id={`recap-${entryId}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={8000}
          rows={7}
          autoFocus
          placeholder="Was ist in diesem Kapitel geschehen? Wer hat was getan, was wurde entschieden, was ist offen geblieben?"
          className="rounded-md border border-line bg-surface px-3 py-2 text-base text-fg outline-none focus:border-accent sm:text-sm"
        />
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" disabled={pending} className="rounded-md bg-accent-strong px-3 py-1.5 text-xs font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50">
            {pending ? "Speichere …" : "Speichern"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setText(recap ?? "");
              setError(null);
            }}
            className="rounded-md px-3 py-1.5 text-xs text-muted hover:text-fg"
          >
            Abbrechen
          </button>
          {recap && (
            <button type="button" disabled={pending} onClick={() => save("")} className="ml-auto rounded-md px-3 py-1.5 text-xs text-muted hover:text-red-500">
              Zusammenfassung entfernen
            </button>
          )}
          <span className="ml-auto text-xs text-muted">{text.length} / 8000</span>
        </div>
      </form>
    );
  }

  if (!recap) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition ${closed ? "bg-surface-2 text-fg-soft hover:text-accent" : "text-muted hover:text-fg"}`}
      >
        <NotebookPen className="h-3.5 w-3.5" strokeWidth={2} />
        {closed ? "Zusammenfassung schreiben" : "Zusammenfassung hinzufügen"}
      </button>
    );
  }

  return (
    <div className="mx-auto mt-2 max-w-xl text-left">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mx-auto flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-xs text-fg-soft transition hover:text-accent"
      >
        <NotebookPen className="h-3.5 w-3.5" strokeWidth={2} />
        Zusammenfassung {open ? "ausblenden" : "lesen"}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={2} />
      </button>
      {open && (
        <div className="mt-2 rounded-xl border border-line bg-surface p-4">
          <p className="whitespace-pre-line text-sm leading-relaxed text-fg-soft">{recap}</p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
            <span>{recapAt ? `Zuletzt geändert am ${formatDateTime(recapAt)}` : ""}</span>
            <button type="button" onClick={() => setEditing(true)} className="transition hover:text-fg">
              Bearbeiten
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
