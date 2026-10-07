"use client";

import { useEffect, useRef, useState } from "react";

// Aktions-Symbole (Bearbeiten, Löschen …) einer Zeile: mit Maus erst beim Darüberfahren, am Handy erst nach einmal Antippen der Zeile.
// Während `keepVisible` (z. B. beim Bearbeiten) bleiben sie sichtbar.
export function RevealRow({
  children,
  actions,
  keepVisible = false,
  className = "",
}: {
  children: React.ReactNode;
  actions?: React.ReactNode;
  keepVisible?: boolean;
  className?: string;
}) {
  const [tapped, setTapped] = useState(false);
  const ref = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (!tapped) return;
    const outside = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setTapped(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [tapped]);

  return (
    <li
      ref={ref}
      data-tapped={tapped ? "" : undefined}
      onClick={(e) => {
        if (!window.matchMedia("(hover: none)").matches) return;
        if ((e.target as HTMLElement).closest("button, a, input, textarea, select")) return;
        setTapped((v) => !v);
      }}
      className={`group flex items-center gap-2 ${className}`}
    >
      {children}
      {actions && (
        <div
          className={`flex shrink-0 items-center gap-0.5 ${
            keepVisible
              ? ""
              : "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-within:opacity-100 [@media(hover:none)]:pointer-events-none [@media(hover:none)]:opacity-0 [@media(hover:none)]:group-data-[tapped]:pointer-events-auto [@media(hover:none)]:group-data-[tapped]:opacity-100"
          }`}
        >
          {actions}
        </div>
      )}
    </li>
  );
}
