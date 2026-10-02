"use client";

import { useEffect } from "react";

const NAMES = ["active_character_id", "active_world_id"];
const ONE_YEAR = 60 * 60 * 24 * 365;

// Schreibt die Auswahl von Welt und Charakter beim App-Start als dauerhaftes Cookie neu. Ältere
// Sitzungen haben sie noch als Session-Cookie, das beim Schließen der App verloren ginge.
export function SelectionCookieKeeper() {
  useEffect(() => {
    for (const name of NAMES) {
      const match = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
      if (match) document.cookie = `${match}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
    }
  }, []);
  return null;
}
