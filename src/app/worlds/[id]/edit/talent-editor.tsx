"use client";

import { ArrowDown, ArrowUp, Plus, RotateCcw, X } from "lucide-react";
import { ATTR_TABLE } from "@/lib/charakterbogen-stats";
import { DEFAULT_TALENTS, MAX_TALENTS, MAX_TALENT_NAME, type TalentAttr, type TalentDef } from "@/lib/talents";

const field = "rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-fg outline-none focus:border-accent";
// Glück fließt in kein Talent ein
const ATTRS = ATTR_TABLE.filter((a) => a.code !== "GL");

export function TalentEditor({ rows, onChange }: { rows: TalentDef[]; onChange: (rows: TalentDef[]) => void }) {
  const setRows = (update: TalentDef[] | ((r: TalentDef[]) => TalentDef[])) => onChange(typeof update === "function" ? update(rows) : update);
  const set = (i: number, patch: Partial<TalentDef>) => setRows((r) => r.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const move = (i: number, d: number) =>
    setRows((r) => {
      const j = i + d;
      if (j < 0 || j >= r.length) return r;
      const next = [...r];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-1.5">
        {rows.map((t, i) => (
          <li key={i} className="grid grid-cols-[1fr_auto] items-center gap-1.5 rounded-xl border border-line p-2 sm:flex sm:flex-wrap sm:rounded-none sm:border-0 sm:p-0">
            <input
              value={t.name}
              maxLength={MAX_TALENT_NAME}
              onChange={(e) => set(i, { name: e.target.value })}
              aria-label="Name des Talents"
              className={`min-w-0 sm:min-w-[8rem] sm:flex-1 ${field}`}
            />
            <span className="flex items-center sm:order-3">
              <button type="button" onClick={() => move(i, -1)} aria-label="Nach oben" className="rounded p-2 text-muted sm:p-1 hover:bg-surface-2 hover:text-fg">
                <ArrowUp className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
              <button type="button" onClick={() => move(i, 1)} aria-label="Nach unten" className="rounded p-2 text-muted sm:p-1 hover:bg-surface-2 hover:text-fg">
                <ArrowDown className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
              <button type="button" onClick={() => setRows((r) => r.filter((_, j) => j !== i))} aria-label="Entfernen" className="rounded p-2 text-muted sm:p-1 hover:bg-surface-2 hover:text-red-500">
                <X className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </span>
            <div className="col-span-2 grid grid-cols-2 gap-1.5 sm:order-2 sm:contents">
            {[0, 1].map((k) => (
              <select
                key={k}
                value={t.attrs[k]}
                onChange={(e) => {
                  const attrs = [...t.attrs] as [TalentAttr, TalentAttr];
                  attrs[k] = e.target.value as TalentAttr;
                  set(i, { attrs });
                }}
                aria-label={k === 0 ? "Erstes Attribut" : "Zweites Attribut"}
                className={`min-w-0 ${field}`}
              >
                {ATTRS.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.name}
                  </option>
                ))}
              </select>
            ))}
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        {rows.length < MAX_TALENTS && (
          <button
            type="button"
            onClick={() => setRows((r) => [...r, { name: "", attrs: ["IN", "IG"] }])}
            className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Talent hinzufügen
          </button>
        )}
        <button
          type="button"
          onClick={() => setRows(DEFAULT_TALENTS.map((t) => ({ ...t, attrs: [...t.attrs] as [TalentAttr, TalentAttr] })))}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"
        >
          <RotateCcw className="h-4 w-4" strokeWidth={2} />
          Standardliste
        </button>
      </div>
    </div>
  );
}
