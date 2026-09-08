"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setActiveCharacter } from "@/app/characters/actions";
import type { Character } from "@/lib/types";

export function CharacterSwitcher({
  characters,
  activeId,
  className = "",
}: {
  characters: Character[];
  activeId: string | null;
  className?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (characters.length <= 1) return null;

  return (
    <select
      value={activeId ?? ""}
      disabled={isPending}
      onChange={(e) => {
        const id = e.target.value;
        startTransition(async () => {
          await setActiveCharacter(id);
          router.refresh();
        });
      }}
      className={`shrink-0 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-sm text-fg outline-none focus:border-accent ${className}`}
    >
      {characters.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
