"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, ChevronDown } from "lucide-react";
import { setActiveWorld } from "@/app/worlds/actions";
import { WorldCover } from "./world-cover";
import type { World } from "@/lib/types";

// Weltname links in der Kopfzeile am Handy: ein Tipp klappt direkt die Liste der eigenen Welten auf, ohne das Menü zu öffnen. Weitere Welt-Aktionen (verwalten, entdecken …) stehen im Menü oben rechts.
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
    <div ref={ref} className="relative min-w-0 flex-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        data-tour="world"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Welt: ${activeWorld.name}. Welt wechseln`}
        className="flex h-10 max-w-full items-center gap-2 rounded-full py-1 pl-1 pr-2.5 text-left transition hover:bg-surface-2 active:bg-surface-3 disabled:opacity-60"
      >
        <WorldCover name={activeWorld.name} coverUrl={activeWorld.cover_image_url} className="h-7 w-7 shrink-0 rounded-lg text-xs" />
        <span className="min-w-0 truncate font-serif text-[17px] leading-tight text-fg min-[400px]:text-lg">{activeWorld.name}</span>
        <ChevronDown className="hidden h-4 w-4 shrink-0 text-muted min-[400px]:block" strokeWidth={2} aria-hidden />
      </button>
      {open && (
        <div className="menu-pop absolute left-0 top-full z-50 mt-1 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-line bg-surface shadow-lg">
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
                  <WorldCover name={w.name} coverUrl={w.cover_image_url} className="h-7 w-7 shrink-0 rounded-lg text-xs" />
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
