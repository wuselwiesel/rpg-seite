"use client";

import { useTransition } from "react";
import { setActiveWorld } from "./actions";

export function EnterWorldButton({ worldId }: { worldId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => setActiveWorld(worldId))}
      className="shrink-0 rounded-full border border-line px-4 py-1.5 text-sm font-medium text-fg-soft transition hover:border-accent hover:text-accent disabled:opacity-50"
    >
      Betreten
    </button>
  );
}
