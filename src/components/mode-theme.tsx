"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { getAppMode } from "@/lib/app-mode";

// Setzt den App-Modus als Attribut am <html>, damit die Redaktion (siehe globals.css) ein eigenes Farbschema bekommt.
export function ModeTheme() {
  const mode = getAppMode(usePathname());

  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-mode", mode);
  }, [mode]);

  return null;
}
