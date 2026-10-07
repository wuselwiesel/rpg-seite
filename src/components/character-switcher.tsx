"use client";

import { useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { setActiveCharacter } from "@/app/characters/actions";
import { characterPathAfterSwitch } from "@/lib/character-switch";
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
  const pathname = usePathname();

  if (characters.length <= 1) return null;

  return (
    <select
      value={activeId ?? ""}
      disabled={isPending}
      data-tour="character"
      onChange={(e) => {
        const id = e.target.value;
        // Steht man gerade auf dem Profil oder dem ChaBo eines eigenen Charakters, soll nach dem Wechsel
        // dieselbe Seite des neu aktiven Charakters angezeigt werden (nicht die alte stehen bleiben).
        const target = characterPathAfterSwitch(pathname, characters.map((c) => c.id), id);
        startTransition(async () => {
          await setActiveCharacter(id);
          if (target) router.push(target);
          else router.refresh();
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
