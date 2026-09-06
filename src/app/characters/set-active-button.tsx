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
      className="rounded-full border border-stone-700 px-3 py-1 text-xs font-medium text-stone-300 transition hover:border-amber-600 hover:text-amber-400 disabled:opacity-50"
    >
      Aktivieren
    </button>
  );
}
