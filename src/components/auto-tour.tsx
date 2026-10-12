"use client";

import { useEffect } from "react";
import { startTour, readToursDone } from "@/lib/tour";

const KEY = "wortwinkel:auto-tour-started";

// Startet den Rundgang „Erste Schritte“ einmalig beim ersten Besuch einer neuen Person; jederzeit überspringbar.
export function AutoTour({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    let started = false;
    try {
      started = localStorage.getItem(KEY) === "1";
    } catch {
      /* egal */
    }
    if (started || readToursDone().includes("erste-schritte")) return;
    // Erst beim Start merken (nicht vorher): sonst überspringt der zweite Durchlauf im Entwicklungsmodus den Rundgang
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(KEY, "1");
      } catch {
        /* egal */
      }
      startTour("erste-schritte");
    }, 1200);
    return () => window.clearTimeout(t);
  }, [enabled]);
  return null;
}
