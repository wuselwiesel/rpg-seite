"use client";

import { useEffect } from "react";
import { PALETTE_STORAGE_KEY } from "@/lib/palettes";

// Hell/Dunkel und Farbpalette stehen als Klasse bzw. Attribut am <html> (gesetzt vom Skript im Kopf, gespeichert im Browser).
// React schreibt die Klasse des <html> beim Neuladen der Seitenstruktur (z. B. nach dem Weltwechsel) aus dem Server-Stand neu
// und löscht dabei „dark“. Dieser Wächter stellt die gespeicherte Wahl sofort wieder her.
function wantsDark(): boolean {
  try {
    const stored = localStorage.getItem("theme");
    if (stored) return stored === "dark";
  } catch {
    /* ohne Speicher: wie das Gerät */
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeKeeper() {
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const dark = wantsDark();
      if (root.classList.contains("dark") !== dark) root.classList.toggle("dark", dark);
      try {
        const palette = localStorage.getItem(PALETTE_STORAGE_KEY);
        if (palette && root.getAttribute("data-palette") !== palette) root.setAttribute("data-palette", palette);
      } catch {
        /* nichts zu tun */
      }
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, { attributes: true, attributeFilter: ["class", "data-palette"] });
    return () => observer.disconnect();
  }, []);
  return null;
}
