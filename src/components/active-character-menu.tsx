"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Plus } from "lucide-react";
import { setActiveCharacter } from "@/app/characters/actions";
import { CharacterAvatar } from "./character-avatar";
import type { Character } from "@/lib/types";

// Kopfzeile am Handy: zeigt den aktiven Charakter und wechselt zwischen den eigenen.
export function ActiveCharacterMenu({
  characters,
  activeCharacter,
  avatarOnly = false,
}: {
  characters: Character[];
  activeCharacter: Character | null;
  // Nur Avatar + Pfeil (z. B. im Feed neben dem Logo), sonst Avatar + Benutzername.
  avatarOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (!activeCharacter) {
    return (
      <Link href="/characters/new" className="text-sm font-medium text-accent">
        Charakter erstellen
      </Link>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className="flex max-w-full items-center gap-2.5 rounded-full py-1 pl-1 pr-2.5 text-left transition hover:bg-surface-2 active:bg-surface-3 disabled:opacity-60"
      >
        <CharacterAvatar name={activeCharacter.name} avatarUrl={activeCharacter.avatar_url} size={36} />
        {!avatarOnly && (
          <span className="min-w-0 truncate font-serif text-lg leading-tight text-fg">
            {activeCharacter.username ?? activeCharacter.name}
          </span>
        )}
        <ChevronDown className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-surface p-2 shadow-lg">
          <div className="max-h-72 overflow-y-auto">
            {characters.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setOpen(false);
                  if (c.id === activeCharacter.id) return;
                  startTransition(async () => {
                    await setActiveCharacter(c.id);
                    router.refresh();
                  });
                }}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-surface-2"
              >
                <CharacterAvatar name={c.name} avatarUrl={c.avatar_url} size={32} />
                <span className="min-w-0 flex-1 truncate text-sm text-fg">{c.name}</span>
                {c.id === activeCharacter.id && <Check className="h-4 w-4 shrink-0 text-accent" strokeWidth={2} />}
              </button>
            ))}
          </div>
          <Link
            href="/characters/new"
            onClick={() => setOpen(false)}
            className="mt-1 flex items-center gap-2 rounded-xl border-t border-line px-2 py-2.5 text-sm text-fg-soft transition hover:bg-surface-2 hover:text-fg"
          >
            <Plus className="h-4 w-4 shrink-0" strokeWidth={2} />
            Neuer Charakter
          </Link>
        </div>
      )}
    </div>
  );
}
