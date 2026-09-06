"use client";

import { useTransition } from "react";
import { deleteCharacter } from "../../actions";

export function DeleteCharacterButton({
  characterId,
  characterName,
}: {
  characterId: string;
  characterName: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (
          confirm(
            `"${characterName}" wirklich löschen? Alle Beiträge, Kommentare und Story-Einträge dieses Charakters werden unwiderruflich gelöscht.`,
          )
        ) {
          startTransition(() => deleteCharacter(characterId));
        }
      }}
      className="rounded-md border border-line px-4 py-2 text-sm text-fg-soft transition hover:border-red-500 hover:text-red-600 disabled:opacity-50 dark:hover:text-red-400"
    >
      {isPending ? "Lösche..." : "Charakter löschen"}
    </button>
  );
}
