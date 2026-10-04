"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

// Macht ein Bild (z. B. das Profilbild) anklickbar: Ein Klick zeigt es groß über der Seite, Klick daneben, ✕ oder Escape schließen.
export function ZoomableImage({ src, alt, children }: { src: string; alt: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={`${alt} vergrößern`} className="block cursor-zoom-in rounded-full">
        {children}
      </button>
      {open &&
        createPortal(
          <div role="dialog" aria-modal="true" aria-label={alt} onClick={() => setOpen(false)} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 sm:p-8">
            <button
              type="button"
              aria-label="Schließen"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} draggable={false} onClick={(e) => e.stopPropagation()} className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl" />
          </div>,
          document.body,
        )}
    </>
  );
}
