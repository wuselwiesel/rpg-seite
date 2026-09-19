"use client";

import { useSyncExternalStore } from "react";
import { Check } from "lucide-react";
import { PALETTES, DEFAULT_PALETTE, PALETTE_STORAGE_KEY, type PaletteId } from "@/lib/palettes";

function subscribeToPaletteChange(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-palette"] });
  return () => observer.disconnect();
}

function getPaletteSnapshot(): PaletteId {
  return (document.documentElement.getAttribute("data-palette") as PaletteId | null) ?? DEFAULT_PALETTE;
}

function getPaletteServerSnapshot(): PaletteId {
  return DEFAULT_PALETTE;
}

function subscribeToDarkChange(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

export function PaletteSwitcher() {
  const active = useSyncExternalStore(subscribeToPaletteChange, getPaletteSnapshot, getPaletteServerSnapshot);
  const isDark = useSyncExternalStore(
    subscribeToDarkChange,
    () => document.documentElement.classList.contains("dark"),
    () => false,
  );

  function choose(id: PaletteId) {
    document.documentElement.setAttribute("data-palette", id);
    localStorage.setItem(PALETTE_STORAGE_KEY, id);
  }

  return (
    <div className="grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-6">
      {PALETTES.map((palette) => (
        <button
          key={palette.id}
          type="button"
          onClick={() => choose(palette.id)}
          title={palette.name}
          className="flex min-w-0 flex-col items-center gap-1.5"
        >
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-full border border-line ring-2 ring-offset-2 ring-offset-app transition ${
              active === palette.id ? "ring-fg" : "ring-transparent"
            }`}
            style={{
              background: (() => {
                const c = isDark ? palette.dark : palette.light;
                return `linear-gradient(135deg, ${c.bg} 0 34%, ${c.accent} 34% 67%, ${c.strong} 67% 100%)`;
              })(),
            }}
          >
            {active === palette.id && (
              <Check className="h-4 w-4 text-white drop-shadow-[0_0_2px_rgba(0,0,0,0.9)]" strokeWidth={3} />
            )}
          </span>
          <span className="max-w-full truncate text-xs text-fg-soft">{palette.name}</span>
        </button>
      ))}
    </div>
  );
}
