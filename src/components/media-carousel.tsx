"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Mehrere Fotos zum Wischen (Scroll-Snap) mit Punkten; Pfeile am Desktop.
export function MediaCarousel({ urls, alt, className = "" }: { urls: string[]; alt: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  function go(delta: number) {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ left: el.clientWidth * (index + delta), behavior: "smooth" });
  }

  return (
    <div className={`relative ${className}`}>
      <div
        ref={ref}
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="flex aspect-[4/5] w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {urls.map((url, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={url}
            src={url}
            alt={`${alt} ${i + 1} von ${urls.length}`}
            loading={i === 0 ? "eager" : "lazy"}
            decoding="async"
            draggable={false}
            className="h-full w-full shrink-0 snap-center bg-surface-2 object-cover"
          />
        ))}
      </div>
      <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/45 px-1.5 py-px text-[11px] font-medium text-white/90">
        {index + 1}/{urls.length}
      </span>
      {index > 0 && (
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Vorheriges Foto"
          className="absolute left-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-neutral-900 shadow sm:flex"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2} />
        </button>
      )}
      {index < urls.length - 1 && (
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Nächstes Foto"
          className="absolute right-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-neutral-900 shadow sm:flex"
        >
          <ChevronRight className="h-5 w-5" strokeWidth={2} />
        </button>
      )}
      <div className="pointer-events-none flex justify-center gap-1 pt-2.5" aria-hidden>
        {urls.map((url, i) => (
          <span
            key={url}
            className={`rounded-full transition-all duration-200 ${
              i === index ? "h-1.5 w-1.5 bg-accent-strong" : "h-[5px] w-[5px] bg-line"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
