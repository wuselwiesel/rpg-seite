"use client";

import { Plus, RotateCcw, X } from "lucide-react";
import { ATTR_TABLE } from "@/lib/charakterbogen-stats";
import { DEFAULT_NATURES, MAX_NATURES, MAX_NATURE_NAME, NATURE_BONUS_MAX, NATURE_BONUS_MIN, newNatureId, type NatureAttr, type NatureDef } from "@/lib/natures";

const field = "rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-fg outline-none focus:border-accent";
// Glück bekommt keinen Bonus
const ATTRS = ATTR_TABLE.filter((a) => a.code !== "GL");

// Besondere Naturen der Welt: je Natur ein Name und feste Boni (oder Abzüge) bei den Attributen.
export function NatureEditor({ rows, onChange }: { rows: NatureDef[]; onChange: (rows: NatureDef[]) => void }) {
  const patch = (i: number, p: Partial<NatureDef>) => onChange(rows.map((n, j) => (j === i ? { ...n, ...p } : n)));

  function setBonus(i: number, code: NatureAttr, raw: string) {
    const bonuses = { ...rows[i].bonuses };
    const n = parseInt(raw, 10);
    if (raw.trim() === "" || raw.trim() === "-" || Number.isNaN(n) || n === 0) delete bonuses[code];
    else bonuses[code] = Math.max(NATURE_BONUS_MIN, Math.min(NATURE_BONUS_MAX, n));
    patch(i, { bonuses });
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.length === 0 && <p className="text-sm text-muted">Keine besondere Natur.</p>}
      <ul className="flex flex-col gap-3">
        {rows.map((n, i) => (
          <li key={n.id} className="flex flex-col gap-2 rounded-xl border border-line p-3">
            <div className="flex items-center gap-2">
              <input
                value={n.name}
                maxLength={MAX_NATURE_NAME}
                onChange={(e) => patch(i, { name: e.target.value })}
                aria-label="Name der Natur"
                placeholder="Name der Natur"
                className={`min-w-0 flex-1 ${field}`}
              />
              <button
                type="button"
                onClick={() => onChange(rows.filter((_, j) => j !== i))}
                aria-label={`${n.name || "Natur"} entfernen`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-red-500"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {ATTRS.map((a) => (
                <label key={a.code} className="flex flex-col gap-0.5 text-xs text-muted">
                  <span className="truncate">{a.name}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={NATURE_BONUS_MIN}
                    max={NATURE_BONUS_MAX}
                    value={n.bonuses[a.code as NatureAttr] ?? ""}
                    placeholder="0"
                    onChange={(e) => setBonus(i, a.code as NatureAttr, e.target.value)}
                    className={`w-full ${field}`}
                  />
                </label>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        {rows.length < MAX_NATURES && (
          <button
            type="button"
            onClick={() => onChange([...rows, { id: newNatureId(), name: "", bonuses: {} }])}
            className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Natur hinzufügen
          </button>
        )}
        <button
          type="button"
          onClick={() => onChange(DEFAULT_NATURES.map((n) => ({ ...n, bonuses: { ...n.bonuses } })))}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"
        >
          <RotateCcw className="h-4 w-4" strokeWidth={2} />
          Standardliste
        </button>
      </div>
    </div>
  );
}
