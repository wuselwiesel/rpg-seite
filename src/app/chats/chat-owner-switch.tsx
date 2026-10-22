"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import { setActiveCharacter } from "@/app/characters/actions";
import { CharacterAvatar } from "@/components/character-avatar";

type Own = { id: string; name: string; username: string | null; avatar_url: string | null };

// Kopf der Chatliste: Name der aktiven Figur; mit mehreren eigenen Figuren öffnet ein Tipp darauf die Auswahl, danach zeigt die Liste deren Nachrichten.
export function ChatOwnerSwitch({ characters, activeId, subtitle }: { characters: Own[]; activeId: string; subtitle: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const active = characters.find((c) => c.id === activeId);
  const title = active?.username ?? active?.name ?? "";

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (characters.length <= 1) {
    return (
      <div className="min-w-0">
        <h1 className="truncate font-serif text-2xl text-fg">{title}</h1>
        <p className="truncate text-xs text-muted">{subtitle}</p>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative min-w-0">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label="Charakter wechseln" className="flex max-w-full items-center gap-1.5 text-left">
        <h1 className="truncate font-serif text-2xl text-fg">{title}</h1>
        <ChevronDown className={`h-5 w-5 shrink-0 text-muted transition ${open ? "rotate-180" : ""}`} strokeWidth={2} />
      </button>
      <p className="truncate text-xs text-muted">{subtitle}</p>
      {open && (
        <ul role="menu" className="absolute left-0 top-full z-30 mt-2 flex max-h-[60vh] w-64 max-w-[80vw] flex-col gap-0.5 overflow-y-auto rounded-2xl border border-line bg-surface p-1.5 shadow-xl">
          {characters.map((c) => (
            <li key={c.id} role="none">
              <button
                type="button"
                role="menuitem"
                disabled={pending}
                onClick={() => {
                  setOpen(false);
                  if (c.id === activeId) return;
                  start(async () => {
                    await setActiveCharacter(c.id);
                    router.refresh();
                  });
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-fg transition hover:bg-surface-2"
              >
                <CharacterAvatar name={c.name} avatarUrl={c.avatar_url} size={32} />
                <span className="min-w-0 flex-1 truncate">{c.username ?? c.name}</span>
                {c.id === activeId && <Check className="h-4 w-4 shrink-0 text-accent" strokeWidth={2} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
