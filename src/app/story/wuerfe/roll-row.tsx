"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteStoryEntry } from "../actions";

// Eine Zeile im Würfelverlauf: Klick springt zur Zeile des Wurfs in der Szene. Eigene Würfe lassen sich löschen
// (erst nachfragen, dann löschen; der Wurf verschwindet damit auch aus der Szene).
export function RollRow({ entryId, storyPostId, mine, children }: { entryId: string; storyPostId: string; mine: boolean; children: React.ReactNode }) {
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function remove() {
    setError(null);
    startTransition(async () => {
      const err = await deleteStoryEntry(entryId, storyPostId);
      if (err) setError(err);
      else router.refresh();
    });
  }

  return (
    <li className="relative">
      <Link
        href={`/story/${storyPostId}#beitrag-${entryId}`}
        className={`flex items-start gap-3 rounded-2xl border border-line bg-surface p-3.5 transition hover:border-accent/50 hover:bg-surface-2/50 ${mine ? "pr-12" : ""}`}
      >
        {children}
      </Link>
      {mine && !asking && (
        <button
          type="button"
          onClick={() => setAsking(true)}
          aria-label="Wurf löschen"
          title="Wurf löschen"
          className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-red-600 dark:hover:text-red-400"
        >
          <Trash2 className="h-4 w-4" strokeWidth={2} />
        </button>
      )}
      {mine && asking && (
        <div className="mt-1.5 flex flex-wrap items-center justify-end gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm">
          <span className="text-fg-soft">Wurf löschen?</span>
          <button type="button" onClick={remove} disabled={pending} className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50">
            {pending ? "…" : "Ja"}
          </button>
          <button type="button" onClick={() => setAsking(false)} disabled={pending} className="rounded-md px-2.5 py-1 text-xs text-muted transition hover:bg-surface hover:text-fg">
            Nein
          </button>
          {error && (
            <p role="alert" className="w-full text-right text-xs text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
