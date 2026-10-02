"use client";

import { useSyncExternalStore } from "react";
import { BADGE_NAMES_KEY, BADGE_PREF_EVENT, BADGE_PROFILE_KEY } from "@/lib/badges";
import { badgePrefEnabled } from "./badge-row";

function subscribe(callback: () => void) {
  window.addEventListener(BADGE_PREF_EVENT, callback);
  return () => window.removeEventListener(BADGE_PREF_EVENT, callback);
}

function Row({ storageKey, title, hint }: { storageKey: string; title: string; hint: string }) {
  const enabled = useSyncExternalStore(subscribe, () => badgePrefEnabled(storageKey), () => true);

  function toggle() {
    try {
      localStorage.setItem(storageKey, enabled ? "off" : "on");
    } catch {
      /* egal */
    }
    window.dispatchEvent(new Event(BADGE_PREF_EVENT));
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-fg">{title}</p>
        <p className="text-xs text-muted">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={title}
        onClick={toggle}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${enabled ? "bg-accent-strong" : "bg-surface-3"}`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            enabled ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  );
}

export function BadgePrefs() {
  return (
    <div className="flex flex-col gap-4">
      <Row storageKey={BADGE_PROFILE_KEY} title="Badges in Profilen anzeigen" hint="Die Badge-Reihe unter der Bio. Gilt für dieses Gerät." />
      <Row storageKey={BADGE_NAMES_KEY} title="Badge neben Namen anzeigen" hint="Das Haupt-Badge bei Beiträgen und Kommentaren. Gilt für dieses Gerät." />
    </div>
  );
}
