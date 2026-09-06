"use client";

import { useTransition } from "react";
import { setActiveCharacter } from "./actions";

export function SetActiveButton({ characterId }: { characterId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => setActiveCharacter(characterId))}
      className="rounded-full border border-line px-3 py-1 text-xs font-medium text-fg-soft transition hover:border-accent hover:text-accent disabled:opacity-50"
    >
      Aktivieren
    </button>
  );
}
