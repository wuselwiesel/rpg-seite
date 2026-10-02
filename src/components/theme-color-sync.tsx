"use client";

import { useEffect } from "react";

// Die Titelleiste der installierten App (und die Statusleiste am Handy) übernimmt die Seitenfarbe – auch bei
// Palettenwechsel und Dunkelmodus. Das <meta> wird nur verändert, nie entfernt (React verwaltet es).
export function ThemeColorSync() {
  useEffect(() => {
    const apply = () => {
      const bg = getComputedStyle(document.body).backgroundColor;
      if (!bg || bg === "rgba(0, 0, 0, 0)") return;
      document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", bg));
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.documentElement, { attributes: true });
    const dark = window.matchMedia("(prefers-color-scheme: dark)");
    dark.addEventListener("change", apply);
    return () => {
      observer.disconnect();
      dark.removeEventListener("change", apply);
    };
  }, []);
  return null;
}
