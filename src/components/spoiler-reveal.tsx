"use client";

import { useEffect } from "react";

// Ein Klick auf einen Spoiler (markierter Text im Beitrag oder ||Text|| im Chat) deckt ihn auf, ein zweiter verbirgt ihn wieder.
// Eine einzige Weiche für die ganze Seite; im Editor selbst bleibt der Text lesbar.
export function SpoilerReveal() {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as Element | null;
      const el = target?.closest?.('span[data-type="spoiler"]');
      if (!el || el.closest(".ProseMirror")) return;
      // Ein Link im Spoiler soll erst nach dem Aufdecken folgen
      if (!el.classList.contains("spoiler-open")) e.preventDefault();
      el.classList.toggle("spoiler-open");
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}
