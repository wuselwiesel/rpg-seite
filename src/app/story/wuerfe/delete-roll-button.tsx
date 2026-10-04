"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteStoryEntry } from "../actions";

// Löscht einen Wurf (er verschwindet damit auch aus der Szene). Erst nachfragen, dann löschen.
export function DeleteRollButton({ entryId, storyPostId }: { entryId: string; storyPostId: string }) {
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

  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} aria-label="Wurf löschen" title="Wurf löschen" className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-red-600 dark:hover:text-red-400">
        <Trash2 className="h-4 w-4" strokeWidth={2} />
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5 text-sm">
        <span className="text-fg-soft">Löschen?</span>
        <button type="button" onClick={remove} disabled={pending} className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50">
          {pending ? "…" : "Ja"}
        </button>
        <button type="button" onClick={() => setAsking(false)} disabled={pending} className="rounded-md px-2 py-1 text-xs text-muted transition hover:bg-surface-2 hover:text-fg">
          Nein
        </button>
      </div>
      {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
