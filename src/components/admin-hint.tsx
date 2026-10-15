"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { X } from "lucide-react";

const KEY = "ww-admin-tools-hint-v1";

// Einmaliger Hinweis für Welt-Admins auf Übersicht und Meldungen; wegklickbar und danach nie wieder da
const EVENT = "ww-admin-hint";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

// Sichtbar, solange noch nichts gespeichert ist (auf dem Server und ohne Speicher: ausgeblendet)
function getSnapshot() {
  try {
    return localStorage.getItem(KEY) ? false : true;
  } catch {
    return false;
  }
}

export function AdminHint({ worldId }: { worldId: string }) {
  const visible = useSyncExternalStore(subscribe, getSnapshot, () => false);
  if (!visible) return null;
  function hide() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      // egal
    }
    window.dispatchEvent(new Event(EVENT));
  }
  return (
    <div role="note" className="mb-6 flex items-start gap-3 rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-fg">
      <p className="min-w-0 flex-1">
        Neu für Admins: Die <Link href={`/worlds/${worldId}/uebersicht`} onClick={hide} className="font-medium text-accent hover:underline">Übersicht</Link> zeigt dir Zahlen zu deiner Welt, und du bekommst Meldungen bei neuen Mitgliedern und Charakteren. Die Meldungen schaltest du unter „Bearbeiten“ ein und aus.
      </p>
      <button type="button" onClick={hide} aria-label="Hinweis ausblenden" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg">
        <X className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
}
