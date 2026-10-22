"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { CharacterAvatar } from "./character-avatar";

// Profilbild, das man antippen kann: öffnet es groß (Schließen per Tipp, Esc oder Kreuz). Ohne Bild bleibt es ein normaler Buchstaben-Kreis.
export function ZoomAvatar({ name, avatarUrl, size = 40 }: { name: string; avatarUrl: string | null | undefined; size?: number }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!avatarUrl) return <CharacterAvatar name={name} avatarUrl={avatarUrl} size={size} />;
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label={`Profilbild von ${name} vergrößern`}
        className="shrink-0 rounded-full transition hover:opacity-90 active:scale-95"
      >
        <CharacterAvatar name={name} avatarUrl={avatarUrl} size={size} />
      </button>
      {open &&
        createPortal(
          <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-3 bg-black/80 p-4" role="dialog" aria-modal="true" aria-label={`Profilbild von ${name}`} onClick={() => setOpen(false)}>
            <button type="button" onClick={() => setOpen(false)} aria-label="Schließen" className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white">
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatarUrl} alt={name} draggable={false} onClick={(e) => e.stopPropagation()} className="max-h-[80vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl" />
            <p className="text-sm font-medium text-white">{name}</p>
          </div>,
          document.body,
        )}
    </>
  );
}
