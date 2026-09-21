"use client";

import { useEffect } from "react";

// Kommt man aus einer Benachrichtigung ("… wartet auf dich"), springt die Seite zum letzten Beitrag.
export function ScrollToLast({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    let tries = 0;
    // Bilder/Editor laden nach; kurz nachbessern, bis die Position stimmt.
    const timer = window.setInterval(() => {
      const el = document.getElementById("letzter-beitrag");
      if (el) el.scrollIntoView({ behavior: tries === 0 ? "auto" : "instant", block: "start" });
      if (++tries >= 4) window.clearInterval(timer);
    }, 250);
    return () => window.clearInterval(timer);
  }, [enabled]);
  return null;
}
