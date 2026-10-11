"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";
export const ACTION_FAILED_EVENT = "wortwinkel:action-failed";

// Hinweis „Neu laden“, sobald eine neuere Version der App läuft als die, die diese Seite geladen hat
// (sonst können Aktionen wie Senden ins Leere laufen). Geprüft beim Zurückkehren zur Seite und wenn eine Aktion fehlschlägt.
export function UpdateNotice() {
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if (BUILD_ID === "dev") return;
    let last = 0;
    let stop = false;
    async function check(force = false) {
      const now = Date.now();
      if (!force && now - last < 60_000) return;
      last = now;
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        const data = (await res.json()) as { id?: string };
        if (!stop && data.id && data.id !== "dev" && data.id !== BUILD_ID) setStale(true);
      } catch {
        /* offline: nichts anzeigen */
      }
    }
    const onVisible = () => document.visibilityState === "visible" && void check();
    const onFailed = () => void check(true);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener(ACTION_FAILED_EVENT, onFailed);
    const timer = window.setInterval(() => void check(), 5 * 60_000);
    void check();
    return () => {
      stop = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener(ACTION_FAILED_EVENT, onFailed);
      window.clearInterval(timer);
    };
  }, []);

  if (!stale) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[60] flex justify-center px-4 lg:bottom-6">
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong shadow-lg"
      >
        <RefreshCw className="h-4 w-4" strokeWidth={2} />
        Neue Version – neu laden
      </button>
    </div>
  );
}
