"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { purgeCharacter, restoreCharacter } from "../actions";

export function DeletedCharacterActions({ characterId, name }: { characterId: string; name: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(job: () => Promise<string | null>) {
    setError(null);
    startTransition(async () => {
      const err = await job();
      if (err) setError(err);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => restoreCharacter(characterId))}
          className="rounded-full bg-surface-2 px-3 py-1 text-xs font-medium text-fg transition hover:bg-surface-3 disabled:opacity-50"
        >
          Wiederherstellen
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm(`"${name}" endgültig löschen? Alle Beiträge, Kommentare, Nachrichten und Story-Einträge dieses Charakters werden dann unwiderruflich gelöscht.`)) {
              run(() => purgeCharacter(characterId));
            }
          }}
          className="rounded-full border border-line px-3 py-1 text-xs font-medium text-fg-soft transition hover:border-red-500 hover:text-red-600 disabled:opacity-50 dark:hover:text-red-400"
        >
          Endgültig löschen
        </button>
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
