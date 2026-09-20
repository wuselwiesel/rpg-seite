"use client";

import { useState, useTransition } from "react";
import { saveNotificationPrefs } from "./actions";

type WorldWithCharacters = { id: string; name: string; characters: { id: string; name: string }[] };

export type PrefsValue = {
  dnd_enabled: boolean;
  dnd_start: string;
  dnd_end: string;
  digest_enabled: boolean;
  digest_only: boolean;
  muted_world_ids: string[];
  muted_character_ids: string[];
};

const time = "rounded-md border border-line bg-surface px-2 py-1.5 text-base text-fg outline-none focus:border-accent";

// Feinere Steuerung der Benachrichtigungen: Nicht stören, tägliche Zusammenfassung, stumme Welten/Charaktere.
export function NotificationSettings({ initial, worlds }: { initial: PrefsValue; worlds: WorldWithCharacters[] }) {
  const [prefs, setPrefs] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const toggleIn = (key: "muted_world_ids" | "muted_character_ids", id: string) =>
    setPrefs((p) => ({ ...p, [key]: p[key].includes(id) ? p[key].filter((x) => x !== id) : [...p[key], id] }));

  function save() {
    setMessage(null);
    startTransition(async () => {
      const err = await saveNotificationPrefs({
        dndEnabled: prefs.dnd_enabled,
        dndStart: prefs.dnd_start,
        dndEnd: prefs.dnd_end,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        digestEnabled: prefs.digest_enabled,
        digestOnly: prefs.digest_only,
        mutedWorldIds: prefs.muted_world_ids,
        mutedCharacterIds: prefs.muted_character_ids,
      });
      setMessage(err ?? "Gespeichert.");
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-3 text-sm text-fg">
          <input
            type="checkbox"
            checked={prefs.dnd_enabled}
            onChange={(e) => setPrefs({ ...prefs, dnd_enabled: e.target.checked })}
            className="h-4 w-4 accent-[var(--accent-strong)]"
          />
          Nicht stören
        </label>
        {prefs.dnd_enabled && (
          <div className="ml-7 flex flex-wrap items-center gap-2 text-sm text-fg-soft">
            von
            <input type="time" value={prefs.dnd_start} onChange={(e) => setPrefs({ ...prefs, dnd_start: e.target.value })} className={time} aria-label="Ruhezeit von" />
            bis
            <input type="time" value={prefs.dnd_end} onChange={(e) => setPrefs({ ...prefs, dnd_end: e.target.value })} className={time} aria-label="Ruhezeit bis" />
            <span className="w-full text-xs text-muted">In dieser Zeit kommen keine Push-Nachrichten. In der Glocke siehst du trotzdem alles.</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-3 text-sm text-fg">
          <input
            type="checkbox"
            checked={prefs.digest_enabled}
            onChange={(e) => setPrefs({ ...prefs, digest_enabled: e.target.checked })}
            className="h-4 w-4 accent-[var(--accent-strong)]"
          />
          Tägliche Zusammenfassung (abends)
        </label>
        {prefs.digest_enabled && (
          <label className="ml-7 flex items-center gap-3 text-sm text-fg-soft">
            <input
              type="checkbox"
              checked={prefs.digest_only}
              onChange={(e) => setPrefs({ ...prefs, digest_only: e.target.checked })}
              className="h-4 w-4 accent-[var(--accent-strong)]"
            />
            Nur die Zusammenfassung, keine einzelnen Push-Nachrichten
          </label>
        )}
      </div>

      {worlds.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-fg">Stumm schalten</p>
          <p className="-mt-2 text-xs text-muted">Für stumme Welten und Charaktere kommt kein Push. Die Glocke zeigt sie weiter an.</p>
          {worlds.map((w) => (
            <div key={w.id} className="rounded-xl bg-surface-2 p-3">
              <label className="flex items-center gap-3 text-sm font-medium text-fg">
                <input
                  type="checkbox"
                  checked={prefs.muted_world_ids.includes(w.id)}
                  onChange={() => toggleIn("muted_world_ids", w.id)}
                  className="h-4 w-4 accent-[var(--accent-strong)]"
                />
                {w.name} (ganze Welt)
              </label>
              <div className="mt-2 flex flex-col gap-1.5 pl-7">
                {w.characters.map((c) => (
                  <label key={c.id} className="flex items-center gap-3 text-sm text-fg-soft">
                    <input
                      type="checkbox"
                      checked={prefs.muted_character_ids.includes(c.id) || prefs.muted_world_ids.includes(w.id)}
                      disabled={prefs.muted_world_ids.includes(w.id)}
                      onChange={() => toggleIn("muted_character_ids", c.id)}
                      className="h-4 w-4 accent-[var(--accent-strong)]"
                    />
                    {c.name}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-md bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Speichere..." : "Speichern"}
        </button>
        {message && <span role="status" className="text-sm text-muted">{message}</span>}
      </div>
    </div>
  );
}
