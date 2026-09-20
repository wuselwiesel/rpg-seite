"use client";

import { useEffect } from "react";

const TEXT_INPUT = 'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="file"]):not([type="button"]):not([type="submit"]), textarea, select, [contenteditable="true"]';

// iOS-Safari lässt fixierte Leisten (untere Navigation) nach dem Schließen der Tastatur oft mitten
// im Bild hängen. Solange ein Feld fokussiert ist, blenden wir die Leiste aus (html.kb-open) und
// stoßen danach das Layout neu an.
export function KeyboardFix() {
  useEffect(() => {
    const root = document.documentElement;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function nudge() {
      const y = window.scrollY;
      window.scrollTo(window.scrollX, y + 1);
      window.scrollTo(window.scrollX, y);
    }
    function onFocusIn(e: FocusEvent) {
      if (!(e.target instanceof Element) || !e.target.matches(TEXT_INPUT)) return;
      if (timer) clearTimeout(timer);
      root.classList.add("kb-open");
    }
    function onFocusOut() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const active = document.activeElement;
        if (active && active.matches(TEXT_INPUT)) return;
        root.classList.remove("kb-open");
        nudge();
      }, 200);
    }
    function onViewport() {
      const vv = window.visualViewport;
      if (vv && vv.height >= window.innerHeight - 1 && !document.activeElement?.matches(TEXT_INPUT)) {
        root.classList.remove("kb-open");
        nudge();
      }
    }

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    window.visualViewport?.addEventListener("resize", onViewport);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      window.visualViewport?.removeEventListener("resize", onViewport);
      if (timer) clearTimeout(timer);
    };
  }, []);

  return null;
}
