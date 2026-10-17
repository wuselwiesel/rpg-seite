"use client";

import { useEffect } from "react";

// Chat-Räume mit eigenem Farbschema: Seitenhintergrund, Überscroll-Bereich und die Statusleiste des Browsers (theme-color)
// bekommen dieselbe Farbe. Sonst scheint oben die helle Standardfarbe durch und die Kopfzeile wirkt „verwaschen“.
// Nur am Handy (der Chat füllt dort die ganze Seite): am Computer bleibt die Farbe im Chat-Bereich, Seitenleiste und Liste behalten die App-Farben.
export function usePageBackground(color: string | null | undefined) {
  useEffect(() => {
    if (!color) return;
    const html = document.documentElement;
    const body = document.body;
    const mq = window.matchMedia("(min-width: 1024px)");
    const metas = [...document.querySelectorAll('meta[name="theme-color"]')];
    const prevMeta = metas.map((m) => m.getAttribute("content"));
    const prev = { html: html.style.backgroundColor, body: body.style.backgroundColor };

    function restore() {
      html.style.backgroundColor = prev.html;
      body.style.backgroundColor = prev.body;
      metas.forEach((m, i) => {
        if (prevMeta[i] != null) m.setAttribute("content", prevMeta[i]!);
      });
    }
    function apply() {
      if (mq.matches) {
        restore();
        return;
      }
      html.style.backgroundColor = color!;
      body.style.backgroundColor = color!;
      metas.forEach((m) => m.setAttribute("content", color!));
    }
    apply();
    mq.addEventListener("change", apply);
    return () => {
      mq.removeEventListener("change", apply);
      restore();
    };
  }, [color]);
}
