"use client";

import { useState, useTransition } from "react";
import { LogOut } from "lucide-react";
import { leaveWorld } from "../actions";

// „Welt verlassen“: als Text-Knopf auf der Weltseite oder als kleines Symbol in der Weltenliste (erscheint beim Darüberfahren).
export function LeaveWorldButton({ worldId, worldName, variant = "text" }: { worldId: string; worldName?: string; variant?: "text" | "icon" }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function leave() {
    if (!confirm(worldName ? `„${worldName}“ wirklich verlassen? Deine Charaktere bleiben in der Welt erhalten.` : "Diese Welt wirklich verlassen?")) return;
    setError(null);
    startTransition(async () => {
      const err = await leaveWorld(worldId);
      if (err) setError(err);
    });
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        disabled={isPending}
        onClick={leave}
        title={error ?? "Welt verlassen"}
        aria-label={`${worldName ?? "Welt"} verlassen`}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted opacity-100 transition hover:bg-surface-2 hover:text-red-600 disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100 dark:hover:text-red-400"
      >
        <LogOut className="h-4 w-4" strokeWidth={2} />
      </button>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={leave}
        className="rounded-md border border-line px-4 py-2 text-sm text-fg-soft transition hover:border-red-500 hover:text-red-600 disabled:opacity-50 dark:hover:text-red-400"
      >
        Welt verlassen
      </button>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
