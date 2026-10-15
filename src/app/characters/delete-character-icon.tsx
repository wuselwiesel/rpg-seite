"use client";

import { confirmDialog, alertDialog } from "@/components/confirm-dialog";
import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteCharacter } from "./actions";

// Papierkorb-Symbol in der Zeile eines Charakters: blendet ihn aus (Beiträge und Nachrichten bleiben erhalten, unter „Gelöscht“ wiederherstellbar).
export function DeleteCharacterIcon({ characterId, characterName }: { characterId: string; characterName: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      aria-label={`${characterName} löschen`}
      title="Charakter löschen"
      onClick={async () => {
        if (!(await confirmDialog({ message: `"${characterName}" löschen? Alles, was der Charakter geschrieben hat, bleibt erhalten.`, confirmLabel: "Löschen", danger: true }))) return;
        startTransition(async () => {
          const result = await deleteCharacter(characterId);
          if (result) void alertDialog(result);
        });
      }}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-red-600 disabled:opacity-50 dark:hover:text-red-400"
    >
      <Trash2 className="h-4 w-4" strokeWidth={2} />
    </button>
  );
}
