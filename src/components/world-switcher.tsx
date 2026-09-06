"use client";

import { useTransition } from "react";
import { setActiveWorld } from "@/app/worlds/actions";
import type { World } from "@/lib/types";

export function WorldSwitcher({
  worlds,
  activeId,
}: {
  worlds: World[];
  activeId: string | null;
}) {
  const [isPending, startTransition] = useTransition();

  if (worlds.length <= 1) return null;

  return (
    <select
      value={activeId ?? ""}
      disabled={isPending}
      onChange={(e) => startTransition(() => setActiveWorld(e.target.value))}
      className="w-full rounded-lg border border-line bg-app px-2.5 py-1.5 text-sm text-fg outline-none focus:border-accent"
    >
      {worlds.map((w) => (
        <option key={w.id} value={w.id}>
          {w.name}
        </option>
      ))}
    </select>
  );
}
