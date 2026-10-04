"use client";

import { useLayoutEffect } from "react";
import { useAppMode } from "@/components/mode-context";

// Setzt den App-Modus als Attribut am <html>, damit die Redaktion (siehe globals.css) ein eigenes Farbschema bekommt.
export function ModeTheme() {
  const mode = useAppMode();

  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-mode", mode);
  }, [mode]);

  return null;
}
