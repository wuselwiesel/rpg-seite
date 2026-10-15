"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { setActiveWorld } from "@/app/worlds/actions";
import { WorldCover } from "./world-cover";
import type { World } from "@/lib/types";

// Weltname unter der Kopfzeile am Handy: ein Tipp klappt direkt die Liste der eigenen Welten auf (wie beim Charakterwechsel),
// ohne das Menü zu öffnen. Weitere Welt-Aktionen (verwalten, entdecken …) stehen im Menü oben rechts.
export function MobileWorldPicker({ worlds, activeWorld }: { worlds: World[]; activeWorld: World }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative px-4 pb-1.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        data-tour="world"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Welt: ${activeWorld.name}. Welt wechseln`}
        className="flex max-w-full items-center gap-2 py-0.5 text-left text-xs text-muted transition hover:text-fg-soft disabled:opacity-60"
      >
        <WorldCover name={activeWorld.name} coverUrl={activeWorld.cover_image_url} className="h-4 w-4 shrink-0 rounded text-[8px]" />
        <span className="min-w-0 truncate font-medium text-fg-soft">{activeWorld.name}</span>
      </button>
      {open && (
        <div className="menu-pop absolute left-4 top-full z-50 mt-1 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-line bg-surface shadow-lg">
          <ul role="listbox" aria-label="Welt wechseln" className="max-h-72 overflow-y-auto p-1.5">
            {worlds.map((w) => (
              <li key={w.id} role="option" aria-selected={w.id === activeWorld.id}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setOpen(false);
                    if (w.id !== activeWorld.id) startTransition(() => setActiveWorld(w.id));
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-surface-2 active:bg-surface-3 disabled:opacity-60"
                >
                  <WorldCover name={w.name} coverUrl={w.cover_image_url} className="h-8 w-8 shrink-0 rounded-lg text-xs" />
                  <span className="min-w-0 flex-1 truncate text-sm text-fg">{w.name}</span>
                  {w.id === activeWorld.id && <Check className="h-4 w-4 shrink-0 text-accent" strokeWidth={2.5} />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
