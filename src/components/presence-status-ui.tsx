"use client";

import { useState } from "react";
import { CUSTOM_STATUS_MAX, PRESENCE_STATUSES, type PresenceEntry, type PresenceStatusId } from "@/lib/presence-status";
import { SymbolPicker } from "./symbol-picker";

type Presence = {
  myStatus: PresenceStatusId | null;
  myCustom: string;
  toggle: (id: PresenceStatusId) => void;
  setCustom: (text: string) => void;
};

export function StatusPicker({ presence }: { presence: Presence }) {
  const { myStatus, myCustom, toggle, setCustom } = presence;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [symbols, setSymbols] = useState(false);

  function open() {
    setDraft(myCustom);
    setEditing(true);
  }
  function save() {
    setCustom(draft);
    setEditing(false);
    setSymbols(false);
  }
  function clear() {
    setCustom("");
    setDraft("");
    setEditing(false);
    setSymbols(false);
  }

  const chip = (active: boolean) =>
    `rounded-full border px-2.5 py-1 transition ${
      active ? "border-accent bg-accent/10 text-fg" : "border-line text-muted hover:text-fg-soft"
    }`;

  return (
    <div className="flex flex-col gap-2 text-xs">
      <div className="flex flex-wrap items-center gap-1.5" aria-label="Status">
        <span className="text-muted">Status:</span>
        {PRESENCE_STATUSES.map((s) => (
          <button key={s.id} type="button" onClick={() => toggle(s.id)} aria-pressed={myStatus === s.id} className={chip(myStatus === s.id)}>
            {s.chip}
          </button>
        ))}
        <button
          type="button"
          onClick={() => (editing ? setEditing(false) : open())}
          aria-pressed={!!myCustom}
          className={chip(!!myCustom || editing)}
        >
          {myCustom ? `✎ ${myCustom}` : "✎ eigener …"}
        </button>
      </div>
      {editing && (
        <div className="flex flex-col gap-2 rounded-xl bg-surface-2 p-2">
          <div className="flex items-center gap-1.5">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  save();
                }
              }}
              maxLength={CUSTOM_STATUS_MAX}
              placeholder="z. B. 🌙 schreibt die nächste Szene …"
              aria-label="Eigener Status"
              className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-fg"
            />
            <button type="button" onClick={() => setSymbols((v) => !v)} aria-pressed={symbols} className={chip(symbols)}>
              ☾ ✦
            </button>
          </div>
          {symbols && (
            <SymbolPicker
              onPick={(sym) => setDraft((d) => (d + sym).slice(0, CUSTOM_STATUS_MAX))}
              onClose={() => setSymbols(false)}
            />
          )}
          <div className="flex justify-end gap-1.5">
            {myCustom && (
              <button type="button" onClick={clear} className="rounded-full px-3 py-1 text-muted hover:text-fg">
                Entfernen
              </button>
            )}
            <button type="button" onClick={save} className="rounded-full bg-accent-strong px-3 py-1 font-medium text-on-accent-strong">
              Setzen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function StatusList({ others, hideIds = [] }: { others: Record<string, PresenceEntry>; hideIds?: string[] }) {
  const entries = Object.entries(others).filter(([id]) => !hideIds.includes(id));
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-col gap-0.5 text-xs text-muted" role="status">
      {entries.map(([id, o]) => (
        <span key={id}>
          {o.name} {o.text}
        </span>
      ))}
    </div>
  );
}
