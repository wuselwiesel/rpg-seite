"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setActiveCharacter } from "@/app/characters/actions";
import type { Character } from "@/lib/types";

export function CharacterSwitcher({
  characters,
  activeId,
}: {
  characters: Character[];
  activeId: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (characters.length === 0) return null;

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
      className="rounded-md border border-stone-700 bg-stone-900 px-2 py-1 text-sm text-stone-100 outline-none focus:border-amber-600"
    >
      {characters.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
