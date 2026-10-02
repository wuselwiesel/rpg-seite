"use client";

import { useEffect } from "react";
import { DEFAULT_FONT_KEY } from "@/lib/default-font";
import { saveDefaultFont } from "@/app/profile/font-actions";

const SYNCED_KEY = "wortwinkel:default-font-synced";

// Gleicht die Standard-Schrift zwischen Konto und Gerät ab: Ist im Konto eine gesetzt, gilt sie; sonst wird eine
// bereits auf diesem Gerät gewählte einmalig ins Konto übernommen.
export function DefaultFontSync({ loggedIn, accountFontId }: { loggedIn: boolean; accountFontId: string | null }) {
  useEffect(() => {
    if (!loggedIn) return;
    try {
      const synced = localStorage.getItem(SYNCED_KEY) === "1";
      if (accountFontId) {
        if (localStorage.getItem(DEFAULT_FONT_KEY) !== accountFontId) localStorage.setItem(DEFAULT_FONT_KEY, accountFontId);
      } else if (synced) {
        // Auf einem anderen Gerät zurückgesetzt: hier ebenfalls entfernen.
        localStorage.removeItem(DEFAULT_FONT_KEY);
      } else {
        const local = localStorage.getItem(DEFAULT_FONT_KEY);
        if (local) void saveDefaultFont(local).catch(() => {});
      }
      localStorage.setItem(SYNCED_KEY, "1");
    } catch {
      /* egal */
    }
  }, [loggedIn, accountFontId]);
  return null;
}
