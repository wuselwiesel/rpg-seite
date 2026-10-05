"use client";

import { useEffect, useState } from "react";
import { ArrowDown } from "lucide-react";

function scrollToLast() {
  document.getElementById("letzter-beitrag")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Springt zur letzten Nachricht der Szene. "inline": Textknopf in der Überschrift;
// "floating": schwebender Knopf, solange der letzte Beitrag noch unterhalb des sichtbaren Bereichs liegt.
export function JumpToLast({ variant }: { variant: "inline" | "floating" }) {
  const [below, setBelow] = useState(false);

  useEffect(() => {
    if (variant !== "floating") return;
    const el = document.getElementById("letzter-beitrag");
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      setBelow(!entry.isIntersecting && entry.boundingClientRect.top > (entry.rootBounds?.height ?? window.innerHeight));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [variant]);

  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={scrollToLast}
        className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1 text-xs font-medium text-fg-soft transition hover:text-fg active:scale-95"
      >
        <ArrowDown className="h-3.5 w-3.5" strokeWidth={2} />
        Zur letzten Nachricht
      </button>
    );
  }

  if (!below) return null;
  return (
    <button
      type="button"
      onClick={scrollToLast}
      aria-label="Zur letzten Nachricht springen"
      className="menu-pop pointer-events-auto flex h-11 items-center gap-1.5 rounded-full bg-accent-strong px-4 text-sm font-medium text-on-accent-strong shadow-lg transition active:scale-95"
    >
      <ArrowDown className="h-4 w-4" strokeWidth={2.25} />
      Zur letzten Nachricht
    </button>
  );
}
