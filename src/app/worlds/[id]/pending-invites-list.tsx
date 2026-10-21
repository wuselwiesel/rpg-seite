"use client";

import { useState, useTransition } from "react";
import { withdrawWorldInvite } from "../invite-actions";

// Offene Einladungen der Welt (für Admins) mit „Zurückziehen“
export function PendingInvitesList({ worldId, invites }: { worldId: string; invites: { id: string; name: string }[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (invites.length === 0) return null;
  return (
    <ul className="mt-3 flex flex-col gap-1.5" aria-label="Offene Einladungen">
      {invites.map((invite) => (
        <li key={invite.id} className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2 text-sm">
          <span className="truncate text-fg-soft">
            <span className="text-fg">{invite.name}</span> · eingeladen
          </span>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const err = await withdrawWorldInvite(invite.id, worldId);
                if (err) setError(err);
              })
            }
            className="shrink-0 text-xs text-muted underline decoration-dotted hover:text-fg disabled:opacity-50"
          >
            Zurückziehen
          </button>
        </li>
      ))}
      {error && <li className="text-xs text-red-600 dark:text-red-400">{error}</li>}
    </ul>
  );
}
