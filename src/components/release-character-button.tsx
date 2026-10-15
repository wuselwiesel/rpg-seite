"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { alertDialog, confirmDialog } from "@/components/confirm-dialog";
import { releaseCharacter } from "@/app/characters/claim-actions";

// Eigenen Charakter an die Welt zurückgeben: er wird wieder eine freie Rolle, Beiträge und Geschichte bleiben bei ihm
export function ReleaseCharacterButton({ characterId, characterName }: { characterId: string; characterName: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        const ok = await confirmDialog({
          message: `${characterName} an die Welt zurückgeben? Der Charakter wird wieder eine freie Rolle, die Admins neu vergeben können. Beiträge und Geschichte bleiben bei ihm.`,
          confirmLabel: "Zurückgeben",
          danger: true,
        });
        if (!ok) return;
        startTransition(async () => {
          const err = await releaseCharacter(characterId);
          if (err) void alertDialog(err);
          else router.push("/characters");
        });
      }}
      className="rounded-md border border-line px-4 py-2 text-sm text-fg-soft transition hover:border-accent hover:text-accent disabled:opacity-50"
    >
      An die Welt zurückgeben
    </button>
  );
}
