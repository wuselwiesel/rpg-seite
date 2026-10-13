"use client";

import { useEffect, useState } from "react";
import { Compass, X } from "lucide-react";
import { startTour, readToursDone } from "@/lib/tour";

const KEY = "wortwinkel:tour-offer-dismissed";

// Beim ersten Besuch einer neuen Person: Angebot „Rundgang starten“. Startet nichts von selbst; wer ablehnt oder startet,
// bekommt es nicht noch einmal (der Rundgang bleibt im Menü unter „Rundgänge“ erreichbar).
export function TourOffer({ enabled }: { enabled: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(KEY) === "1";
    } catch {
      /* egal */
    }
    const show = !dismissed && !readToursDone().includes("erste-schritte");
    Promise.resolve().then(() => setVisible(show));
  }, [enabled]);

  if (!enabled || !visible) return null;

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* egal */
    }
  }

  return (
    <section aria-label="Rundgang" className="mb-4 flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-accent">
        <Compass className="h-5 w-5" strokeWidth={2} />
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            dismiss();
            startTour("erste-schritte");
          }}
          className="rounded-full bg-accent-strong px-4 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90"
        >
          Rundgang starten
        </button>
        <button type="button" onClick={dismiss} className="rounded-full px-3 py-1.5 text-sm text-muted transition hover:bg-surface-2 hover:text-fg">
          Später
        </button>
      </div>
      <button type="button" onClick={dismiss} aria-label="Ausblenden" className="shrink-0 rounded-full p-1 text-muted transition hover:bg-surface-2 hover:text-fg">
        <X className="h-4 w-4" strokeWidth={2} />
      </button>
    </section>
  );
}
