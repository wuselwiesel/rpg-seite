"use client";

import { useEffect, useState } from "react";
import { BookOpen, Compass as CompassIcon, Map, Network, X } from "lucide-react";
import { startTour } from "@/lib/tour";

const STEPS = [
  {
    icon: Map,
    title: "Szenen",
    text: "In „Story“ beginnt ihr Szenen mit Ort und Zeit und schreibt sie gemeinsam als Fortsetzungen weiter.",
  },
  {
    icon: Network,
    title: "Wer ist dran?",
    text: "Jede Szene merkt sich, wer als Nächstes schreibt. „Du bist dran“ und die Erinnerung helfen, niemanden zu vergessen.",
  },
  {
    icon: BookOpen,
    title: "Wiki",
    text: "Orte, NPCs und Fraktionen landen im Wiki. Namen aus dem Wiki werden im Text automatisch verlinkt.",
  },
];

// Kurzanleitung für eine Welt: klappt für neue Mitglieder automatisch auf, bleibt sonst als
// kleiner Link verfügbar. "worldId" merkt sich das Schließen pro Welt im Browser.
export function WorldOnboarding({ worldId, worldName, autoOpen }: { worldId: string; worldName: string; autoOpen: boolean }) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    let wasDismissed = false;
    try {
      wasDismissed = localStorage.getItem(`wortwinkel:onboarding-seen:${worldId}`) === "1";
    } catch {
      /* egal */
    }
    setDismissed(wasDismissed);
    setOpen(autoOpen && !wasDismissed);
  }, [worldId, autoOpen]);

  function dismiss() {
    setOpen(false);
    setDismissed(true);
    try {
      localStorage.setItem(`wortwinkel:onboarding-seen:${worldId}`, "1");
    } catch {
      /* egal */
    }
  }

  if (!open) {
    return dismissed ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-3 text-xs text-muted underline decoration-dotted underline-offset-2 hover:text-accent"
      >
        Wie funktioniert {worldName}?
      </button>
    ) : null;
  }

  return (
    <div className="menu-pop mb-4 flex flex-col gap-3 rounded-2xl bg-surface-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-muted">Willkommen in</p>
          <h2 className="font-serif text-lg text-fg">{worldName}</h2>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Kurzanleitung schließen"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface-3 hover:text-fg"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
      <div className="flex flex-col gap-3">
        {STEPS.map((step) => (
          <div key={step.title} className="flex gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-3 text-accent">
              <step.icon className="h-4 w-4" strokeWidth={2} />
            </span>
            <div>
              <p className="text-sm font-medium text-fg">{step.title}</p>
              <p className="text-sm text-fg-soft">{step.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="button"
          onClick={() => {
            dismiss();
            startTour();
          }}
          className="flex items-center gap-1.5 rounded-full bg-accent-strong px-3.5 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90"
        >
          <CompassIcon className="h-3.5 w-3.5" strokeWidth={2} />
          Rundgang starten
        </button>
        <button type="button" onClick={dismiss} className="ml-auto text-sm text-muted hover:text-fg-soft">
          Verstanden
        </button>
      </div>
    </div>
  );
}
