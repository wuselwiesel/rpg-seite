"use client";

import { Compass } from "lucide-react";
import { startTour } from "@/lib/tour";
import { TOURS } from "@/lib/tours";

// Alle Rundgänge als Knöpfe (für die Hilfe-Seite): jeder startet direkt seinen Rundgang.
export function TourButtons() {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <h2 className="mb-3 flex items-center gap-2 font-serif text-xl text-fg">
        <Compass className="h-5 w-5 text-accent" strokeWidth={2} />
        Rundgänge
      </h2>
      <ul className="flex flex-wrap gap-2">
        {TOURS.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => startTour(t.id)}
              className="rounded-full bg-surface-2 px-3.5 py-1.5 text-sm text-fg-soft transition hover:bg-surface-3 hover:text-fg"
            >
              {t.title}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
