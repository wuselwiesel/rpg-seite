"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { respondWorldInvite } from "./invite-actions";

// Annehmen führt in die Welt, Ablehnen entfernt die Einladung aus der Liste
export function InviteResponseButtons({ inviteId }: { inviteId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function respond(accept: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await respondWorldInvite(inviteId, accept);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      if (result.accepted) router.push(`/worlds/${result.worldId}`);
      else router.refresh();
    });
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => respond(false)}
          className="rounded-full border border-line px-4 py-1.5 text-sm font-medium text-fg-soft transition hover:border-accent hover:text-accent disabled:opacity-50"
        >
          Ablehnen
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => respond(true)}
          className="rounded-full bg-accent-strong px-4 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
        >
          Annehmen
        </button>
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
