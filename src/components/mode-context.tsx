"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MODE_COOKIE, getAppMode, isNeutralPath, type AppMode } from "@/lib/app-mode";

type Remembered = Exclude<AppMode, "redaktion">;
const RememberedContext = createContext<Remembered>("ingame");

// Merkt sich den zuletzt benutzten Modus (Ingame oder Story), damit Seiten ohne eigenen Bereich (Charakterprofile) ihn übernehmen.
// Der Startwert kommt vom Server aus dem Cookie, damit Server und Browser beim ersten Anzeigen dasselbe zeigen.
export function ModeProvider({ initial, children }: { initial: Remembered; children: React.ReactNode }) {
  const pathname = usePathname();
  const [remembered, setRemembered] = useState<Remembered>(initial);

  // Auf einer Seite mit eigenem Bereich ist das der gemerkte Modus (gleich beim Anzeigen, nicht erst danach).
  const here = isNeutralPath(pathname) ? null : getAppMode(pathname);
  const current = here === "ingame" || here === "story" ? here : null;
  if (current && current !== remembered) setRemembered(current);

  useEffect(() => {
    if (!current) return;
    try {
      document.cookie = `${MODE_COOKIE}=${current}; path=/; samesite=lax`;
    } catch {
      /* Cookies gesperrt: dann bleibt es beim Standard */
    }
  }, [current]);

  return <RememberedContext.Provider value={remembered}>{children}</RememberedContext.Provider>;
}

// Der Modus der aktuellen Seite (Profile: der zuletzt benutzte).
export function useAppMode(): AppMode {
  return getAppMode(usePathname(), useContext(RememberedContext));
}
