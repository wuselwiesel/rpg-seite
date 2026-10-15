"use client";

import { useEffect } from "react";

// Chat-Räume mit eigenem Farbschema: Seitenhintergrund, Überscroll-Bereich und die Statusleiste des Browsers (theme-color)
// bekommen dieselbe Farbe. Sonst scheint oben die helle Standardfarbe durch und die Kopfzeile wirkt „verwaschen“.
export function usePageBackground(color: string | null | undefined) {
  useEffect(() => {
    if (!color) return;
    const html = document.documentElement;
    const body = document.body;
    const prev = { html: html.style.backgroundColor, body: body.style.backgroundColor };
    const metas = [...document.querySelectorAll('meta[name="theme-color"]')];
    const prevMeta = metas.map((m) => m.getAttribute("content"));
    html.style.backgroundColor = color;
    body.style.backgroundColor = color;
    metas.forEach((m) => m.setAttribute("content", color));
    return () => {
      html.style.backgroundColor = prev.html;
      body.style.backgroundColor = prev.body;
      metas.forEach((m, i) => {
        if (prevMeta[i] != null) m.setAttribute("content", prevMeta[i]!);
      });
    };
  }, [color]);
}
