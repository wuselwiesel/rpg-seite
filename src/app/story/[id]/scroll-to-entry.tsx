"use client";

import { useEffect } from "react";
import { HIGHLIGHT_EVENT, visibleEntryElement } from "@/lib/scene-quote";

const FLASH = "0 0 0 3px var(--accent)";

// Springt zu Nachrichten der Szene und hebt sie kurz hervor. Auslöser:
// - Link auf einen einzelnen Beitrag (#beitrag-…, z. B. aus dem Würfelverlauf), optional mit ?hervor=id1,id2,… für mehrere (Ausschnitte)
// - ein Klick auf ein Zitat im Szenen-Chat (Ereignis HIGHLIGHT_EVENT)
// Frühere Beiträge sind eingeklappt und werden von EarlierEntries aufgeklappt, daher mehrfach versuchen, bis der Beitrag sichtbar ist.
export function ScrollToEntry() {
  useEffect(() => {
    let timer: number | undefined;
    const flashTimers: number[] = [];

    function focusEntries(ids: string[]) {
      window.clearInterval(timer);
      let tries = 0;
      timer = window.setInterval(() => {
        const first = visibleEntryElement(ids[0]);
        if (first) {
          window.clearInterval(timer);
          first.scrollIntoView({ block: "center", behavior: "auto" });
          for (const id of ids) {
            const el = visibleEntryElement(id);
            if (!el) continue;
            el.style.transition = "box-shadow 0.4s";
            el.style.boxShadow = FLASH;
            flashTimers.push(window.setTimeout(() => (el.style.boxShadow = ""), 3000));
          }
        } else if (++tries > 25) window.clearInterval(timer);
      }, 120);
    }

    const hash = location.hash.startsWith("#beitrag-") ? location.hash.slice("#beitrag-".length) : null;
    if (hash) {
      const extra = (new URLSearchParams(location.search).get("hervor") ?? "").split(",").filter((id) => /^[0-9a-f-]{36}$/i.test(id));
      focusEntries(extra.length ? extra : [hash]);
    }

    const onHighlight = (e: Event) => {
      const ids = (e as CustomEvent<string[]>).detail;
      if (ids?.length) focusEntries(ids);
    };
    window.addEventListener(HIGHLIGHT_EVENT, onHighlight);
    return () => {
      window.removeEventListener(HIGHLIGHT_EVENT, onHighlight);
      window.clearInterval(timer);
      flashTimers.forEach((t) => window.clearTimeout(t));
    };
  }, []);
  return null;
}
