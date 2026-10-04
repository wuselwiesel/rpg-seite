"use client";

import { useEffect, useRef, useState } from "react";
import { BookMarked } from "lucide-react";

// Schwebender Kapitel-Sprung: Sobald die Kapitelleiste oben aus dem Bild ist, springt man von überall in der Szene direkt zu einem Kapitel.
// Die Links (#kapitel-N) klappt EarlierEntries bei Bedarf auf.
export function ChapterJump({ chapters }: { chapters: { n: number; title: string }[] }) {
  const [away, setAway] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nav = document.querySelector('nav[aria-label="Kapitel"]');
    if (!nav) return;
    const observer = new IntersectionObserver(([entry]) => setAway(!entry.isIntersecting));
    observer.observe(nav);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  if (!away && !open) return null;
  return (
    <div ref={ref} className="fixed bottom-[calc(9rem+env(safe-area-inset-bottom))] right-4 z-20 flex flex-col items-end gap-2 lg:bottom-20">
      {open && (
        <ul className="menu-pop max-h-72 w-64 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-line bg-surface p-1.5 shadow-lg">
          {chapters.map((c) => (
            <li key={c.n}>
              <a
                href={`#kapitel-${c.n}`}
                onClick={() => setOpen(false)}
                className="flex items-baseline gap-2 rounded-xl px-2.5 py-1.5 text-sm text-fg-soft transition hover:bg-surface-2 hover:text-accent"
              >
                <span className="text-xs text-muted">{c.n}</span>
                <span className="min-w-0 flex-1 truncate">{c.title}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Zu einem Kapitel springen"
        className="menu-pop flex h-11 items-center gap-1.5 rounded-full bg-surface px-4 text-sm font-medium text-fg shadow-lg ring-1 ring-line transition active:scale-95"
      >
        <BookMarked className="h-4 w-4 text-accent" strokeWidth={2} />
        Kapitel
      </button>
    </div>
  );
}
