"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { setPreviousScene } from "../actions";

type SceneRef = { id: string; title: string };

// Vorherige und nächste Szene (Kapitel). Wer die Szene bearbeiten darf, kann die vorherige nachträglich ändern oder lösen.
export function SceneChain({
  storyPostId,
  previous,
  next,
  options,
  canEdit,
}: {
  storyPostId: string;
  previous: SceneRef | null;
  next: SceneRef | null;
  options: SceneRef[];
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [choice, setChoice] = useState(previous?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!previous && !next && !canEdit) return null;

  function save() {
    setError(null);
    startTransition(async () => {
      const err = await setPreviousScene(storyPostId, choice || null);
      if (err) setError(err);
      else setEditing(false);
    });
  }

  if (editing) {
    return (
      <div className="mb-3 flex flex-col gap-2 rounded-lg bg-surface-2 p-2.5">
        <select
          value={choice}
          onChange={(e) => setChoice(e.target.value)}
          aria-label="Vorherige Szene"
          className="rounded-md border border-line bg-surface px-2.5 py-1.5 text-base text-fg outline-none focus:border-accent sm:text-sm"
        >
          <option value="">Keine vorherige Szene</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.title}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={save} disabled={pending} className="rounded-md bg-accent-strong px-3 py-1.5 text-xs font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50">
            {pending ? "Speichert..." : "Speichern"}
          </button>
          <button type="button" onClick={() => { setEditing(false); setChoice(previous?.id ?? ""); setError(null); }} className="rounded-md px-3 py-1.5 text-xs text-muted hover:text-fg">
            Abbrechen
          </button>
        </div>
      </div>
    );
  }

  return (
    <nav aria-label="Szenen" className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
      {previous && (
        <Link href={`/story/${previous.id}`} className="max-w-full truncate transition hover:text-accent">
          ← {previous.title}
        </Link>
      )}
      {next && (
        <Link href={`/story/${next.id}`} className="max-w-full truncate transition hover:text-accent">
          {next.title} →
        </Link>
      )}
      {canEdit && (
        <button type="button" onClick={() => setEditing(true)} aria-label="Vorherige Szene ändern" title="Vorherige Szene ändern" className="flex items-center gap-1 transition hover:text-accent">
          <Pencil className="h-3 w-3" strokeWidth={2} />
          {!previous && !next && "Vorherige Szene"}
        </button>
      )}
    </nav>
  );
}
