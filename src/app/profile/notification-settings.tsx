"use client";

import { useMemo, useState, useTransition } from "react";
import { X } from "lucide-react";
import { saveNotificationPrefs } from "./actions";
import { NOTIFICATION_TYPE_GROUPS } from "@/lib/notification-types";

type WorldWithCharacters = { id: string; name: string; characters: { id: string; name: string }[] };

export type PrefsValue = {
  dnd_enabled: boolean;
  dnd_start: string;
  dnd_end: string;
  digest_enabled: boolean;
  digest_only: boolean;
  muted_world_ids: string[];
  muted_character_ids: string[];
  muted_notification_types: string[];
};

const time = "rounded-md border border-line bg-surface px-2 py-1.5 text-base text-fg outline-none focus:border-accent";

// Sucht unter den eigenen Charakteren einer Welt statt sie alle aufzulisten - praktisch,
// sobald eine Welt mehr als eine Handvoll Charaktere hat.
function CharacterMuteSearch({
  characters,
  mutedIds,
  worldMuted,
  onToggle,
}: {
  characters: { id: string; name: string }[];
  mutedIds: string[];
  worldMuted: boolean;
  onToggle: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const mutedCharacters = characters.filter((c) => mutedIds.includes(c.id));
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return characters.filter((c) => !mutedIds.includes(c.id) && c.name.toLowerCase().includes(q)).slice(0, 8);
  }, [query, characters, mutedIds]);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <input
          type="text"
          value={query}
          disabled={worldMuted}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Charakter suchen zum Stummschalten..."
          className="w-full rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-fg outline-none placeholder:text-muted focus:border-accent disabled:opacity-50"
        />
        {matches.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-md border border-line bg-surface shadow-lg">
            {matches.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onToggle(c.id);
                  setQuery("");
                }}
                className="block w-full px-3 py-1.5 text-left text-sm text-fg-soft transition hover:bg-surface-2 hover:text-fg"
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>
      {mutedCharacters.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {mutedCharacters.map((c) => (
            <span key={c.id} className="flex items-center gap-1.5 rounded-full bg-surface-2 py-1 pl-3 pr-1.5 text-xs text-fg-soft">
              {c.name}
              <button
                type="button"
                onClick={() => onToggle(c.id)}
                disabled={worldMuted}
                aria-label={`${c.name} nicht mehr stummschalten`}
                className="rounded-full p-0.5 transition hover:text-accent disabled:opacity-50"
              >
                <X className="h-3 w-3" strokeWidth={2} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Feinere Steuerung der Benachrichtigungen: Nicht stören, tägliche Zusammenfassung, stumme Welten/Charaktere.
export function NotificationSettings({ initial, worlds }: { initial: PrefsValue; worlds: WorldWithCharacters[] }) {
  const [prefs, setPrefs] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const toggleIn = (key: "muted_world_ids" | "muted_character_ids" | "muted_notification_types", id: string) =>
    setPrefs((p) => ({ ...p, [key]: p[key].includes(id) ? p[key].filter((x) => x !== id) : [...p[key], id] }));

  // Eine Gruppe (z.B. "Gefällt mir") ist an, solange keiner ihrer rohen Typen stummgeschaltet ist.
  const groupEnabled = (types: string[]) => types.every((t) => !prefs.muted_notification_types.includes(t));
  const toggleGroup = (types: string[]) =>
    setPrefs((p) => {
      const nowEnabled = types.every((t) => !p.muted_notification_types.includes(t));
      return {
        ...p,
        muted_notification_types: nowEnabled
          ? [...p.muted_notification_types, ...types.filter((t) => !p.muted_notification_types.includes(t))]
          : p.muted_notification_types.filter((t) => !types.includes(t)),
      };
    });

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
        mutedNotificationTypes: prefs.muted_notification_types,
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

      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-fg">Benachrichtigungen personalisieren</p>
        <div className="flex flex-col divide-y divide-line rounded-xl bg-surface-2 px-3">
          {NOTIFICATION_TYPE_GROUPS.map((g) => (
            <label key={g.key} className="flex items-center justify-between gap-3 py-2.5 text-sm text-fg">
              {g.label}
              <input
                type="checkbox"
                checked={groupEnabled(g.types)}
                onChange={() => toggleGroup(g.types)}
                className="h-4 w-4 accent-[var(--accent-strong)]"
              />
            </label>
          ))}
        </div>
      </div>

      {worlds.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-fg">Stumm schalten</p>
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
              <div className="mt-2 pl-7">
                <CharacterMuteSearch
                  characters={w.characters}
                  mutedIds={prefs.muted_character_ids}
                  worldMuted={prefs.muted_world_ids.includes(w.id)}
                  onToggle={(id) => toggleIn("muted_character_ids", id)}
                />
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
