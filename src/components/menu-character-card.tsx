"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Check, ChevronDown, Plus } from "lucide-react";
import { setActiveCharacter } from "@/app/characters/actions";
import { characterPathAfterSwitch } from "@/lib/character-switch";
import { CharacterAvatar } from "./character-avatar";
import { PresenceControl } from "./character-presence";
import type { Character, Profile } from "@/lib/types";

// Kopf des Handy-Menüs: wer gerade aktiv ist; ein Tipp auf den Pfeil klappt die eigenen Charaktere zum Wechseln auf.
export function MenuCharacterCard({
  characters,
  activeCharacter,
  profile,
  onNavigate,
}: {
  characters: Character[];
  activeCharacter: Character | null;
  profile: Profile | null | undefined;
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();

  if (!activeCharacter) {
    return (
      <Link
        href="/characters/new?welcome=1"
        onClick={onNavigate}
        className="mb-5 flex items-center justify-center rounded-2xl border border-accent/50 bg-accent/10 px-4 py-3 text-[15px] font-medium text-accent transition hover:bg-accent/20"
      >
        + Charakter anlegen
      </Link>
    );
  }

  function switchTo(c: Character) {
    if (c.id === activeCharacter!.id) {
      setOpen(false);
      return;
    }
    // Steht man auf Profil oder ChaBo eines eigenen Charakters, bleibt man nach dem Wechsel auf derselben Seite des neuen
    const target = characterPathAfterSwitch(pathname, characters.map((own) => own.id), c.id);
    startTransition(async () => {
      await setActiveCharacter(c.id);
      setOpen(false);
      onNavigate();
      if (target) router.push(target);
      else router.refresh();
    });
  }

  return (
    <div className="mb-5 rounded-2xl bg-surface-2">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="relative shrink-0">
          <Link href={`/characters/${activeCharacter.id}`} onClick={onNavigate}>
            <CharacterAvatar name={activeCharacter.name} avatarUrl={activeCharacter.avatar_url} size={48} />
          </Link>
          <PresenceControl characterId={activeCharacter.id} online={!!activeCharacter.presence_online} placement="bottom-right" />
        </div>
        <div className="min-w-0 flex-1">
          <Link href={`/characters/${activeCharacter.id}`} onClick={onNavigate} className="block truncate font-serif text-lg text-fg hover:text-accent">
            {activeCharacter.name}
          </Link>
          {profile?.username && (
            <Link href="/profile" onClick={onNavigate} className="block text-xs text-muted hover:text-accent">
              @{profile.nickname || profile.username}
            </Link>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="relative flex h-10 items-center gap-1 rounded-full px-3 text-sm font-medium text-fg-soft transition before:absolute before:-inset-1 hover:bg-surface-3 hover:text-fg"
        >
          Wechseln
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={2} />
        </button>
      </div>
      {open && (
        <div className="border-t border-line/70 p-2">
          <div className="max-h-56 overflow-y-auto">
            {characters.map((c) => (
              <button
                key={c.id}
                type="button"
                disabled={pending}
                onClick={() => switchTo(c)}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-surface-3 disabled:opacity-60"
              >
                <CharacterAvatar name={c.name} avatarUrl={c.avatar_url} size={32} />
                <span className="min-w-0 flex-1 truncate text-sm text-fg">{c.name}</span>
                {c.id === activeCharacter.id && <Check className="h-4 w-4 shrink-0 text-accent" strokeWidth={2} />}
              </button>
            ))}
          </div>
          <Link href="/characters/new" onClick={onNavigate} className="mt-1 flex items-center gap-2 rounded-xl px-2 py-2.5 text-sm text-fg-soft transition hover:bg-surface-3 hover:text-fg">
            <Plus className="h-4 w-4 shrink-0" strokeWidth={2} />
            Neuer Charakter
          </Link>
        </div>
      )}
    </div>
  );
}
