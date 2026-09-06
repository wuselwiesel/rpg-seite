"use client";

import { useState, useTransition } from "react";
import { deleteCharacter } from "../../actions";

export function DeleteCharacterButton({
  characterId,
  characterName,
}: {
  characterId: string;
  characterName: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (
            confirm(
              `"${characterName}" wirklich löschen? Alle Beiträge, Kommentare und Story-Einträge dieses Charakters werden unwiderruflich gelöscht.`,
            )
          ) {
            setError(null);
            startTransition(async () => {
              const result = await deleteCharacter(characterId);
              if (result) setError(result);
            });
          }
        }}
        className="rounded-md border border-line px-4 py-2 text-sm text-fg-soft transition hover:border-red-500 hover:text-red-600 disabled:opacity-50 dark:hover:text-red-400"
      >
        {isPending ? "Lösche..." : "Charakter löschen"}
      </button>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
