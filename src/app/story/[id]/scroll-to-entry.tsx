"use client";

import { useEffect } from "react";

// Link auf einen einzelnen Beitrag (#beitrag-…, z. B. aus dem Würfelverlauf): hinscrollen und kurz hervorheben.
// Frühere Beiträge sind eingeklappt und werden von EarlierEntries aufgeklappt, daher mehrfach versuchen, bis der Beitrag sichtbar ist.
export function ScrollToEntry() {
  useEffect(() => {
    const id = location.hash.startsWith("#beitrag-") ? location.hash.slice(1) : null;
    if (!id) return;
    let tries = 0;
    let flashTimer: number | undefined;
    const timer = window.setInterval(() => {
      const el = document.getElementById(id);
      if (el && el.offsetParent !== null) {
        window.clearInterval(timer);
        el.scrollIntoView({ block: "center", behavior: "auto" });
        el.style.transition = "box-shadow 0.4s";
        el.style.boxShadow = "0 0 0 3px var(--accent)";
        flashTimer = window.setTimeout(() => {
          el.style.boxShadow = "";
        }, 2500);
      } else if (++tries > 25) window.clearInterval(timer);
    }, 120);
    return () => {
      window.clearInterval(timer);
      if (flashTimer) window.clearTimeout(flashTimer);
    };
  }, []);
  return null;
}
