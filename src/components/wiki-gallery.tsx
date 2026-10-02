"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

// Bildergalerie einer Wiki-Seite: Vorschaubilder, Klick öffnet die Großansicht (Pfeiltasten, Esc).
export function WikiGallery({ urls, title }: { urls: string[]; title: string }) {
  const [index, setIndex] = useState<number | null>(null);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIndex(null);
      else if (e.key === "ArrowRight") setIndex((i) => (i === null ? i : (i + 1) % urls.length));
      else if (e.key === "ArrowLeft") setIndex((i) => (i === null ? i : (i - 1 + urls.length) % urls.length));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [index, urls.length]);

  if (urls.length === 0) return null;
  return (
    <>
      <ul className="grid grid-cols-2 gap-2 @xl:grid-cols-3">
        {urls.map((url, i) => (
          <li key={url}>
            <button
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Bild ${i + 1} von ${urls.length} vergrößern`}
              className="block aspect-[4/3] w-full overflow-hidden rounded-lg bg-surface-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`${title}, Bild ${i + 1}`} loading="lazy" className="h-full w-full object-cover transition hover:scale-[1.03]" />
            </button>
          </li>
        ))}
      </ul>
      {index !== null && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true" aria-label="Bild ansehen" onClick={() => setIndex(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={urls[index]} alt={`${title}, Bild ${index + 1}`} className="max-h-full max-w-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
          <button type="button" onClick={() => setIndex(null)} aria-label="Schließen" className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white">
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
          {urls.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex((index - 1 + urls.length) % urls.length);
                }}
                aria-label="Vorheriges Bild"
                className="absolute left-3 rounded-full bg-black/50 p-2 text-white"
              >
                <ChevronLeft className="h-6 w-6" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex((index + 1) % urls.length);
                }}
                aria-label="Nächstes Bild"
                className="absolute right-3 rounded-full bg-black/50 p-2 text-white"
              >
                <ChevronRight className="h-6 w-6" strokeWidth={2} />
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
