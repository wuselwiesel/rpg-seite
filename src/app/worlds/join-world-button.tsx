"use client";

import { useState, useTransition } from "react";
import { joinWorld } from "./actions";

export function JoinWorldButton({ worldId }: { worldId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await joinWorld(worldId);
            if (result) setError(result);
          });
        }}
        className="shrink-0 rounded-full bg-accent-strong px-4 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Trete bei..." : "Beitreten"}
      </button>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
