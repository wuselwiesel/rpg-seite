"use client";

import { useTransition } from "react";
import { setActiveWorld } from "./actions";

// primary: der eine Hauptknopf einer Seite (gefüllt); sonst ein ruhiger Knopf in Listen
export function EnterWorldButton({ worldId, primary = false }: { worldId: string; primary?: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => setActiveWorld(worldId))}
      className={
        primary
          ? "shrink-0 rounded-full bg-accent-strong px-4 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
          : "shrink-0 rounded-full border border-line px-4 py-1.5 text-sm font-medium text-fg-soft transition hover:border-accent hover:text-accent disabled:opacity-50"
      }
    >
      Betreten
    </button>
  );
}
