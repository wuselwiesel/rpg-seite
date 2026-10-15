"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const INTERVAL_MS = 5 * 60_000;

// Meldet im Hintergrund „zuletzt gesehen“ (für die Zahlen im Überblick der Betreiberin): beim Öffnen und danach höchstens alle
// 5 Minuten, solange die App sichtbar ist. Fehler (z. B. Migration noch nicht eingespielt) bleiben stumm.
export function LastSeenPing() {
  useEffect(() => {
    const supabase = createClient();
    let last = 0;
    function ping() {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - last < INTERVAL_MS) return;
      last = now;
      void supabase.rpc("touch_last_seen").then(() => undefined, () => undefined);
    }
    ping();
    const timer = window.setInterval(ping, INTERVAL_MS);
    document.addEventListener("visibilitychange", ping);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", ping);
    };
  }, []);
  return null;
}
