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

export function PaletteSwitcher() {
  const active = useSyncExternalStore(subscribeToPaletteChange, getPaletteSnapshot, getPaletteServerSnapshot);

  function choose(id: PaletteId) {
    document.documentElement.setAttribute("data-palette", id);
    localStorage.setItem(PALETTE_STORAGE_KEY, id);
  }

  return (
    <div className="flex flex-wrap gap-3">
      {PALETTES.map((palette) => (
        <button
          key={palette.id}
          type="button"
          onClick={() => choose(palette.id)}
          title={palette.name}
          className="flex flex-col items-center gap-1.5"
        >
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-app transition ${
              active === palette.id ? "ring-fg" : "ring-transparent"
            }`}
            style={{ background: `linear-gradient(135deg, ${palette.swatchLight} 50%, ${palette.swatchDark} 50%)` }}
          >
            {active === palette.id && (
              <Check className="h-4 w-4 text-white drop-shadow" strokeWidth={3} />
            )}
          </span>
          <span className="text-xs text-fg-soft">{palette.name}</span>
        </button>
      ))}
    </div>
  );
}
