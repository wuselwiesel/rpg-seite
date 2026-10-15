"use client";

import { useState, useTransition } from "react";
import { joinWithInvite } from "../../actions";

export function JoinWithInviteButton({ worldId, token }: { worldId: string; token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const err = await joinWithInvite(worldId, token);
            if (err) setError(err);
          });
        }}
        className="rounded-full bg-accent-strong px-6 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Trete bei..." : "Beitreten"}
      </button>
      {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
