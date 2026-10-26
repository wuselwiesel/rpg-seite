"use client";

import { useEffect, useState } from "react";
import { Share2 } from "lucide-react";

// Desktop: Druckdialog → „Als PDF speichern". Mobil: native Teilen-Funktion (iOS/Android öffnet Drucken → PDF).
// navigator.share() ist auf Mobilgeräten breit unterstützt; window.print() dagegen tut auf vielen mobilen Browsern nichts.
export function PrintButton() {
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    // Nur auf Touchgeräten, auf denen window.print() erfahrungsgemäß nicht funktioniert
    const isTouch = window.matchMedia("(hover: none)").matches;
    setCanShare(isTouch && typeof navigator.share === "function");
  }, []);

  if (canShare) {
    return (
      <button
        type="button"
        onClick={() =>
          void navigator.share({ title: document.title, url: window.location.href }).catch(() => {
            // Abgebrochen oder nicht unterstützt – kein Fehler
          })
        }
        className="flex items-center gap-1.5 rounded-md bg-accent-strong px-3 py-1.5 font-medium text-on-accent-strong transition hover:opacity-90"
      >
        <Share2 className="h-4 w-4" strokeWidth={2} />
        Teilen / PDF speichern
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md bg-accent-strong px-3 py-1.5 font-medium text-on-accent-strong transition hover:opacity-90"
    >
      Als PDF speichern
    </button>
  );
}
