"use client";

import { useState, useTransition } from "react";
import { ChevronDown, NotebookPen } from "lucide-react";
import { setSceneRecap } from "../actions";
import { formatDateTime } from "@/lib/format";

// Selbst geschriebene Zusammenfassung einer Szene zum Nachlesen: aufklappbar, von allen Mitspielenden schreib- und änderbar.
// Ist die Szene abgeschlossen und noch ohne Zusammenfassung, steht die Einladung dazu deutlicher da.
export function SceneSummary({
  storyPostId,
  recap,
  recapAt,
  locked,
}: {
  storyPostId: string;
  recap: string | null;
  recapAt: string | null;
  locked: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(recap ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save(value: string) {
    setError(null);
    start(async () => {
      const err = await setSceneRecap(storyPostId, value);
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
        className="mb-4 flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4"
      >
        <label htmlFor="scene-recap" className="text-sm font-medium text-fg">
          Zusammenfassung dieser Szene
        </label>
        <p className="-mt-1 text-xs text-muted">Für alle zum Nachlesen: Was ist geschehen, was wurde entschieden, was ist offen geblieben?</p>
        <textarea
          id="scene-recap"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={8000}
          rows={8}
          autoFocus
          className="rounded-md border border-line bg-app px-3 py-2 text-base text-fg outline-none focus:border-accent sm:text-sm"
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
            <button type="button" disabled={pending} onClick={() => save("")} className="rounded-md px-3 py-1.5 text-xs text-muted hover:text-red-500">
              Zusammenfassung entfernen
            </button>
          )}
          <span className="ml-auto text-xs text-muted">{text.length} / 8000</span>
        </div>
      </form>
    );
  }

  if (!recap) {
    return locked ? (
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-line px-4 py-3">
        <p className="text-sm text-fg-soft">Diese Szene ist abgeschlossen. Halte fest, was geschehen ist.</p>
        <button type="button" onClick={() => setEditing(true)} className="flex items-center gap-1.5 rounded-lg bg-surface-2 px-3 py-1.5 text-sm font-medium text-fg-soft transition hover:text-fg">
          <NotebookPen className="h-3.5 w-3.5" strokeWidth={2} />
          Zusammenfassung schreiben
        </button>
      </div>
    ) : (
      <div className="mb-4">
        <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-muted transition hover:bg-surface-2 hover:text-fg">
          <NotebookPen className="h-3.5 w-3.5" strokeWidth={2} />
          Zusammenfassung hinzufügen
        </button>
      </div>
    );
  }

  return (
    <section id="zusammenfassung" aria-label="Zusammenfassung der Szene" className="mb-4 scroll-mt-20 rounded-2xl border border-line bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-fg"
      >
        <NotebookPen className="h-4 w-4 text-accent" strokeWidth={2} />
        <span className="flex-1">Zusammenfassung der Szene</span>
        <ChevronDown className={`h-4 w-4 text-muted transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={2} />
      </button>
      {open && (
        <div className="border-t border-line px-4 py-3">
          <p className="whitespace-pre-line text-sm leading-relaxed text-fg-soft">{recap}</p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
            <span>{recapAt ? `Zuletzt geändert am ${formatDateTime(recapAt)}` : ""}</span>
            <button type="button" onClick={() => setEditing(true)} className="transition hover:text-fg">
              Bearbeiten
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
