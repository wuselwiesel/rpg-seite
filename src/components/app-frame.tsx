"use client";

import { usePathname } from "next/navigation";

// Rahmen um Seitenleiste und Inhalt. Das Wiki nutzt am großen Bildschirm viel Breite ohne App-Seitenleiste, aber nicht alles:
// Seitenränder und Höchstbreite setzt wiki-shell.tsx (auf dem Handy bleibt die untere Leiste); alle anderen Seiten behalten
// die begrenzte Breite mit Seitenleiste.
export function AppFrame({ sidebar, children }: { sidebar: React.ReactNode; children: React.ReactNode }) {
  const wide = /^\/wiki(\/|$)/.test(usePathname());
  return (
    <div
      className={`mx-auto flex min-h-full flex-col lg:flex-row ${
        wide ? "" : "max-w-6xl min-[1440px]:max-w-[1360px] min-[1800px]:max-w-[1640px]"
      }`}
    >
      <div className={wide ? "contents lg:hidden" : "contents"}>{sidebar}</div>
      {children}
    </div>
  );
}
