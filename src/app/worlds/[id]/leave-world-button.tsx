"use client";

import { useTransition } from "react";
import { leaveWorld } from "../actions";

export function LeaveWorldButton({ worldId }: { worldId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (confirm("Diese Welt wirklich verlassen?")) {
          startTransition(() => leaveWorld(worldId));
        }
      }}
      className="rounded-md border border-line px-4 py-2 text-sm text-fg-soft transition hover:border-red-500 hover:text-red-600 disabled:opacity-50 dark:hover:text-red-400"
    >
      Welt verlassen
    </button>
  );
}
