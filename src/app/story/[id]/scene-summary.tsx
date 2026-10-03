"use client";

import { useState, useTransition } from "react";
import { ChevronDown, NotebookPen } from "lucide-react";
import { setSceneRecap } from "../actions";
import { EmojiHtml } from "@/components/custom-emoji-provider";
import { RichTextEditor } from "@/components/rich-text-editor";
import { isEmptyRecap, recapToHtml } from "@/lib/recap-html";
import type { Character } from "@/lib/types";
import { formatDateTime } from "@/lib/format";

// Selbst geschriebene Zusammenfassung einer Szene zum Nachlesen: aufklappbar, von allen Mitspielenden schreib- und änderbar.
// Ist die Szene abgeschlossen und noch ohne Zusammenfassung, steht die Einladung dazu deutlicher da.
export function SceneSummary({
  storyPostId,
  recap,
  displayHtml,
  recapAt,
  locked,
  mentionCharacters,
}: {
  storyPostId: string;
  // gespeicherter Text (zum Bearbeiten) und seine mit Wiki-Links angereicherte, bereinigte Anzeige
  recap: string | null;
  displayHtml: string;
  recapAt: string | null;
  locked: boolean;
  mentionCharacters: Character[];
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const initialHtml = recapToHtml(recap);
  const [html, setHtml] = useState(initialHtml);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Beim Speichern prüft der Server noch einmal und bereinigt den Text.
  function save(value: string) {
    setError(null);
    start(async () => {
      const err = await setSceneRecap(storyPostId, value);
      if (err) return setError(err);
      setEditing(false);
      if (!isEmptyRecap(value)) setOpen(true);
    });
  }

  if (editing) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save(html);
        }}
        className="mb-4 flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4"
      >
        <p className="text-sm font-medium text-fg">Zusammenfassung dieser Szene</p>
        <p className="-mt-1 text-xs text-muted">Für alle zum Nachlesen: Was ist geschehen, was wurde entschieden, was ist offen geblieben?</p>
        <RichTextEditor name="recap" initialContent={initialHtml} onChange={setHtml} mentionCharacters={mentionCharacters} minHeight={160} allowFontSelection />
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" disabled={pending} className="rounded-md bg-accent-strong px-3 py-1.5 text-xs font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50">
            {pending ? "Speichere …" : "Speichern"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setHtml(initialHtml);
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
          <EmojiHtml className="post-content text-sm text-fg-soft" html={displayHtml} />
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
