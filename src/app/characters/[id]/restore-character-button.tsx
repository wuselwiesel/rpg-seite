"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { restoreCharacter } from "../actions";

export function RestoreCharacterButton({ characterId }: { characterId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const err = await restoreCharacter(characterId);
            if (err) setError(err);
            else router.refresh();
          })
        }
        className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-4 py-1.5 text-sm font-medium text-fg transition hover:bg-surface-3 disabled:opacity-50"
      >
        {pending ? "Stelle her…" : "Wiederherstellen"}
      </button>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </>
  );
}
