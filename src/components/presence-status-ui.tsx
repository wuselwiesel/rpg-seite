"use client";

import { useState } from "react";
import { CUSTOM_STATUS_MAX, PRESENCE_STATUSES, type PresenceEntry, type PresenceStatusId } from "@/lib/presence-status";
import { SymbolPicker } from "./symbol-picker";

type Presence = {
  myStatus: PresenceStatusId | null;
  myCustom: string;
  toggle: (id: PresenceStatusId) => void;
  setCustom: (text: string) => void;
  clear: () => void;
};

export function StatusPicker({ presence }: { presence: Presence }) {
  const { myStatus, myCustom, toggle, setCustom } = presence;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [symbols, setSymbols] = useState(false);

  const current = myCustom || PRESENCE_STATUSES.find((s) => s.id === myStatus)?.chip || "";

  function close() {
    setOpen(false);
    setSymbols(false);
  }
  function pick(id: PresenceStatusId) {
    toggle(id);
    close();
  }
  function saveCustom() {
    setCustom(draft);
    close();
  }
  function clear() {
    setCustom("");
    setDraft("");
    close();
  }

  return (
    <div className="flex flex-col gap-2 text-xs">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            setDraft(myCustom);
            setOpen((v) => !v);
          }}
          aria-expanded={open}
          className={`rounded-full border px-2.5 py-1 transition ${
            current ? "border-accent bg-accent/10 text-fg" : "border-line text-muted hover:text-fg-soft"
          }`}
        >
          {current ? `Status: ${current}` : "Status setzen"}
        </button>
        {current && (
          <button type="button" onClick={clear} aria-label="Status entfernen" className="text-muted hover:text-fg">
            ✕
          </button>
        )}
      </div>
      {open && (
        <div className="flex flex-col gap-2 rounded-xl bg-surface-2 p-2">
          <div className="flex flex-wrap gap-1.5">
            {PRESENCE_STATUSES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => pick(s.id)}
                aria-pressed={myStatus === s.id}
                className={`rounded-full border px-2.5 py-1 transition ${
                  myStatus === s.id ? "border-accent bg-accent/10 text-fg" : "border-line text-fg-soft hover:text-fg"
                }`}
              >
                {s.chip}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  saveCustom();
                }
              }}
              maxLength={CUSTOM_STATUS_MAX}
              placeholder="Oder selbst schreiben, z. B. 🌙 liest nach …"
              aria-label="Eigener Status"
              className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-fg"
            />
            <button
              type="button"
              onClick={() => setSymbols((v) => !v)}
              aria-pressed={symbols}
              className="rounded-full border border-line px-2.5 py-1 text-fg-soft hover:text-fg"
            >
              ☾ ✦
            </button>
            <button type="button" onClick={saveCustom} className="rounded-full bg-accent-strong px-3 py-1 font-medium text-on-accent-strong">
              Setzen
            </button>
          </div>
          {symbols && (
            <SymbolPicker
              onPick={(sym) => setDraft((d) => (d + sym).slice(0, CUSTOM_STATUS_MAX))}
              onClose={() => setSymbols(false)}
            />
          )}
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
