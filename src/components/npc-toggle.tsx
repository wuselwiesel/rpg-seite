"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setCharacterNpc } from "@/app/characters/actions";

// Charakter in einen NPC umwandeln und zurück (nur die Person, die ihn angelegt hat).
export function NpcToggle({ characterId, initial }: { characterId: string; initial: boolean }) {
  const router = useRouter();
  const [isNpc, setIsNpc] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function change(next: boolean) {
    setIsNpc(next);
    setError(null);
    startTransition(async () => {
      const err = await setCharacterNpc(characterId, next);
      if (err) {
        setIsNpc(!next);
        setError(err);
      } else router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="flex cursor-pointer items-center gap-2 text-sm text-fg-soft">
        <input type="checkbox" checked={isNpc} disabled={pending} onChange={(e) => change(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
        NPC
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
