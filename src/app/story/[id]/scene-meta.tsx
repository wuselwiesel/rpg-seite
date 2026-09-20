"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Clock, MapPin, Pencil } from "lucide-react";
import { updateStoryMeta } from "../actions";

// Ort und Zeitpunkt (in der Spielwelt) einer Szene; die Autor:in kann beides nachträglich ändern.
export function SceneMeta({
  storyPostId,
  location,
  inWorldTime,
  canEdit,
}: {
  storyPostId: string;
  location: string | null;
  inWorldTime: string | null;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [loc, setLoc] = useState(location ?? "");
  const [time, setTime] = useState(inWorldTime ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const err = await updateStoryMeta(storyPostId, loc, time);
      if (err) setError(err);
      else setEditing(false);
    });
  }

  if (editing) {
    return (
      <form onSubmit={save} className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={loc}
          onChange={(e) => setLoc(e.target.value)}
          maxLength={80}
          placeholder="Ort"
          className="w-40 rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-fg outline-none focus:border-accent"
        />
        <input
          value={time}
          onChange={(e) => setTime(e.target.value)}
          maxLength={80}
          placeholder="Zeitpunkt in der Welt"
          className="w-48 rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-fg outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent-strong px-3 py-1.5 text-xs font-medium text-on-accent-strong disabled:opacity-50"
        >
          Speichern
        </button>
        <button type="button" onClick={() => setEditing(false)} className="text-xs text-muted hover:text-fg">
          Abbrechen
        </button>
        {error && <p className="w-full text-xs text-red-600 dark:text-red-400">{error}</p>}
      </form>
    );
  }

  if (!location && !inWorldTime && !canEdit) return null;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-fg-soft">
      {location && (
        <Link
          href={`/story?ort=${encodeURIComponent(location)}`}
          className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-0.5 transition hover:text-accent"
        >
          <MapPin className="h-3 w-3" strokeWidth={2} />
          {location}
        </Link>
      )}
      {inWorldTime && (
        <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-0.5">
          <Clock className="h-3 w-3" strokeWidth={2} />
          {inWorldTime}
        </span>
      )}
      {canEdit && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-muted transition hover:bg-surface-2 hover:text-fg"
        >
          <Pencil className="h-3 w-3" strokeWidth={2} />
          {location || inWorldTime ? "Ändern" : "Ort und Zeit ergänzen"}
        </button>
      )}
    </div>
  );
}
