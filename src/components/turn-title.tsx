"use client";

import { useEffect } from "react";

// Zeigt im Titel der Browser-Registerkarte, dass man in dieser Szene als Nächstes schreibt.
export function TurnTitle({ isMine, title }: { isMine: boolean; title: string }) {
  useEffect(() => {
    if (!isMine) return;
    const original = document.title;
    document.title = `✎ Du bist dran · ${title}`;
    // Next.js setzt den Titel bei Navigationen selbst; beim Verlassen zurück auf den vorherigen
    return () => {
      if (document.title.startsWith("✎ Du bist dran")) document.title = original;
    };
  }, [isMine, title]);
  return null;
}
