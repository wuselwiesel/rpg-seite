"use client";

import { useState } from "react";
import { setAdminNotifyMuted } from "../../actions";
import { WORLD_ADMIN_EVENTS, type WorldAdminEvent } from "@/lib/world-admin-events";

// Schalter für die eigenen Admin-Meldungen: wirken sofort, ohne Speichern-Knopf (sind kein Teil der Welteinstellungen)
export function AdminNotifySwitches({ worldId, mutedInitial }: { worldId: string; mutedInitial: WorldAdminEvent[] }) {
  const [muted, setMuted] = useState<WorldAdminEvent[]>(mutedInitial);
  const [error, setError] = useState<string | null>(null);

  async function toggle(key: WorldAdminEvent, on: boolean) {
    const previous = muted;
    const next = on ? muted.filter((k) => k !== key) : [...muted, key];
    setMuted(next);
    setError(null);
    const err = await setAdminNotifyMuted(worldId, next);
    if (err) {
      setMuted(previous);
      setError(err);
    }
  }

  return (
    // Die Schalter gehören nicht zum Formular „Welt bearbeiten“: kein „Nicht gespeichert“
    <div onInput={(e) => e.stopPropagation()} className="flex flex-col gap-3">
      {WORLD_ADMIN_EVENTS.map((e) => (
        <label key={e.key} className="flex items-center gap-3 text-sm text-fg-soft">
          <input type="checkbox" checked={!muted.includes(e.key)} onChange={(ev) => toggle(e.key, ev.target.checked)} className="h-4 w-4 accent-[var(--accent-strong)]" />
          {e.label}
        </label>
      ))}
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
