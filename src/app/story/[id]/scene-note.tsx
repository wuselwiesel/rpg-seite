"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ClipboardList } from "lucide-react";
import { saveSceneNote } from "../note-actions";

// Notiz der Spielleitung zu dieser Szene; nur für Besitzer:in und Admins der Welt (die Seite zeigt sie sonst nicht an).
export function SceneNote({ storyPostId, initial }: { storyPostId: string; initial: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = text.trim() !== saved.trim();

  function save() {
    setError(null);
    startTransition(async () => {
      const err = await saveSceneNote(storyPostId, text);
      if (err) return setError(err);
      setSaved(text);
    });
  }

  return (
    <section aria-label="Notiz der Spielleitung" className="mb-4 rounded-xl border border-line bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-fg-soft transition hover:text-fg"
      >
        <ClipboardList className="h-4 w-4" strokeWidth={2} aria-hidden />
        Notiz der Spielleitung
        {saved.trim() && !open && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />}
        <ChevronDown className={`ml-auto h-4 w-4 transition ${open ? "rotate-180" : ""}`} strokeWidth={2} aria-hidden />
      </button>
      {open && (
        <div className="flex flex-col gap-2 border-t border-line p-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            maxLength={5000}
            aria-label="Notiz der Spielleitung"
            className="w-full resize-y rounded-lg border border-line bg-app px-3 py-2 text-sm text-fg outline-none focus:border-accent"
          />
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={save}
              disabled={pending || !dirty}
              className="rounded-md bg-accent-strong px-3 py-1.5 text-xs font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
            >
              {pending ? "Speichere …" : "Speichern"}
            </button>
            {!dirty && saved.trim() && <span className="text-xs text-muted">Gespeichert</span>}
          </div>
        </div>
      )}
    </section>
  );
}
