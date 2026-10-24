"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useAppMode } from "./mode-context";
import { WhoSwitcher } from "./who-switcher";
import { CharacterAvatar } from "./character-avatar";
import type { OwnCharacterLite } from "@/lib/active-character";
import type { Character, World } from "@/lib/types";

// Karte oben in der Seitenleiste: im Spiel „Wer und wo“ (Klick öffnet „Du spielst“), in der Redaktion du selbst (führt zu „Du“).
export function SidebarWhoCard({
  worlds,
  activeWorld,
  canManage,
  activeCharacter,
  characters,
  accountName,
}: {
  worlds: World[];
  activeWorld: World;
  canManage: boolean;
  activeCharacter: Character | null;
  characters: OwnCharacterLite[];
  accountName: string;
}) {
  const inRed = useAppMode() === "redaktion";
  return (
    <div className="mb-3 rounded-2xl bg-surface-2 p-1.5">
      {inRed ? (
        <Link href="/redaktion/du" className="flex items-center gap-3 rounded-xl px-1 py-1 transition hover:bg-surface-3">
          <CharacterAvatar name={accountName} avatarUrl={null} size={40} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-medium leading-tight text-fg">{accountName}</span>
            <span className="block text-xs text-muted">Spielerprofil</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} aria-hidden />
        </Link>
      ) : (
        <WhoSwitcher variant="sidebar" worlds={worlds} activeWorld={activeWorld} canManage={canManage} activeCharacter={activeCharacter} characters={characters} />
      )}
    </div>
  );
}
