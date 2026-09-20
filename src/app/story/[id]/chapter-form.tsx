"use client";

import { useState, useTransition } from "react";
import { createChapter } from "../actions";

export function ChapterForm({
  storyPostId,
  worldId,
  onDone,
}: {
  storyPostId: string;
  worldId: string;
  onDone: () => void;
}) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const err = await createChapter(storyPostId, worldId, title, summary);
      if (err) setError(err);
      else onDone();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 rounded-lg bg-surface-2 p-3">
      <p className="text-xs text-muted">
        Ein neues Kapitel trennt die Geschichte und erscheint im Inhaltsverzeichnis. Die Zusammenfassung wird später
        als Rückblick („Zuletzt geschah“) angezeigt.
      </p>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={100}
        required
        placeholder="Kapiteltitel, z. B. Der Nebel steigt"
        className="rounded-md border border-line bg-surface px-3 py-2 text-base text-fg outline-none focus:border-accent sm:text-sm"
      />
      <textarea
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        maxLength={1500}
        rows={2}
        placeholder="Was ist bisher geschehen? (optional, für den Rückblick)"
        className="rounded-md border border-line bg-surface px-3 py-2 text-base text-fg outline-none focus:border-accent sm:text-sm"
      />
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent-strong px-3 py-1.5 text-xs font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Lege an..." : "Kapitel beginnen"}
        </button>
        <button type="button" onClick={onDone} className="rounded-md px-3 py-1.5 text-xs text-muted hover:text-fg">
          Abbrechen
        </button>
      </div>
    </form>
  );
}
