"use client";

import { useState } from "react";
import { Download, Share } from "lucide-react";
import { promptInstall, useInstallState } from "@/lib/install-prompt";

// "App installieren": Android/Chrome öffnet den System-Dialog, auf dem iPhone gibt es die Anleitung.
export function InstallAppButton({ className = "", onDone }: { className?: string; onDone?: () => void }) {
  const state = useInstallState();
  const [showHelp, setShowHelp] = useState(false);

  if (state === "installed" || state === "none") return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          if (state === "prompt") {
            promptInstall();
            onDone?.();
          } else setShowHelp((v) => !v);
        }}
        className={className}
      >
        <Download className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
        App installieren
      </button>
      {showHelp && (
        <p className="mx-3 mt-1 rounded-xl bg-surface-2 px-3 py-2 text-xs leading-relaxed text-fg-soft">
          Tippe unten in Safari auf <Share className="inline h-3.5 w-3.5 align-text-bottom" strokeWidth={2} /> „Teilen“
          und wähle „Zum Home-Bildschirm“. Dann öffnet sich Wortwinkel wie eine App – schneller und ohne Adressleiste.
        </p>
      )}
    </div>
  );
}
