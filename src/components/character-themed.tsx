"use client";

import { useSyncExternalStore } from "react";
import { profileThemeStyle, themeTileColors } from "@/lib/profile-theme";
import type { Character } from "@/lib/types";

function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

// Wendet Schrift und Akzent aus dem Profil-Design eines Charakters auf Beiträge/Nachrichten an
// (ohne die Seitenfarben zu ändern). Für Text-Kacheln stehen --tile-bg / --tile-fg bereit.
export function CharacterThemed({
  character,
  className = "",
  children,
}: {
  character: Pick<Character, "theme_font" | "theme_accent" | "theme_bg"> | null | undefined;
  className?: string;
  children: React.ReactNode;
}) {
  const dark = useSyncExternalStore(
    subscribe,
    () => document.documentElement.classList.contains("dark"),
    () => false,
  );
  const base = profileThemeStyle({ font: character?.theme_font, accent: character?.theme_accent }, dark);
  const tile = themeTileColors({ bg: character?.theme_bg }, dark);
  const style: Record<string, string> = { ...(base as Record<string, string>) };
  // Nur Schrift + Akzent vererben, die Schriftfarbe der Seite bleibt.
  if (tile.bg) style["--tile-bg"] = tile.bg;
  if (tile.fg) style["--tile-fg"] = tile.fg;
  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}
