"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { MAX_PROFILE_FIELDS, type ProfileField } from "@/lib/profile-fields";

const field = "rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent";

type Row = ProfileField & { key: number };

// Eigene Profilfelder (Symbol, Titel, Inhalt) mit Sortierung; schreibt field_icon / field_title / field_text ins Formular.
export function ProfileFieldsEditor({ initial }: { initial: ProfileField[] }) {
  const [nextKey, setNextKey] = useState(initial.length + 1);
  const [rows, setRows] = useState<Row[]>(() => initial.map((f, i) => ({ ...f, key: i })));

  function update(key: number, patch: Partial<ProfileField>) {
    setRows((r) => r.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function move(index: number, dir: -1 | 1) {
    setRows((r) => {
      const target = index + dir;
      if (target < 0 || target >= r.length) return r;
      const copy = [...r];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row, i) => (
        <div key={row.key} className="flex flex-col gap-2 rounded-xl border border-line p-3">
          <div className="flex gap-2">
            <input
              name="field_icon"
              value={row.icon}
              onChange={(e) => update(row.key, { icon: e.target.value })}
              placeholder="🙂"
              aria-label="Symbol"
              className={`w-14 text-center ${field}`}
            />
            <input
              name="field_title"
              value={row.title}
              maxLength={40}
              onChange={(e) => update(row.key, { title: e.target.value })}
              placeholder="Titel"
              aria-label="Titel"
              className={`min-w-0 flex-1 ${field}`}
            />
            <div className="flex shrink-0 items-center">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label="Nach oben"
                className="rounded p-1.5 text-muted transition hover:bg-surface-2 hover:text-fg disabled:opacity-30"
              >
                <ArrowUp className="h-4 w-4" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === rows.length - 1}
                aria-label="Nach unten"
                className="rounded p-1.5 text-muted transition hover:bg-surface-2 hover:text-fg disabled:opacity-30"
              >
                <ArrowDown className="h-4 w-4" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => setRows((r) => r.filter((x) => x.key !== row.key))}
                aria-label="Feld entfernen"
                className="rounded p-1.5 text-muted transition hover:bg-surface-2 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          </div>
          <textarea
            name="field_text"
            rows={2}
            maxLength={300}
            value={row.text}
            onChange={(e) => update(row.key, { text: e.target.value })}
            placeholder="Inhalt"
            aria-label="Inhalt"
            className={field}
          />
        </div>
      ))}
      {rows.length < MAX_PROFILE_FIELDS && (
        <button
          type="button"
          onClick={() => {
            setRows((r) => [...r, { icon: "", title: "", text: "", key: nextKey }]);
            setNextKey((k) => k + 1);
          }}
          className="flex w-fit items-center gap-1.5 rounded-md bg-surface-2 px-3 py-1.5 text-sm font-medium text-fg-soft transition hover:text-fg"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Feld hinzufügen
        </button>
      )}
    </div>
  );
}
