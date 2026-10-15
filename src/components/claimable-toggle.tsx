"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setCharacterClaimable } from "@/app/characters/claim-actions";

// NPC zur Vergabe freigeben: Mitglieder sehen ihn dann unter „Zu vergeben“ und können ihn anfragen
export function ClaimableToggle({ characterId, initial }: { characterId: string; initial: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function change(next: boolean) {
    setOn(next);
    setError(null);
    startTransition(async () => {
      const err = await setCharacterClaimable(characterId, next);
      if (err) {
        setOn(!next);
        setError(err);
      } else router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="flex cursor-pointer items-center gap-2 text-sm text-fg-soft">
        <input type="checkbox" checked={on} disabled={pending} onChange={(e) => change(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
        Zu vergeben
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
