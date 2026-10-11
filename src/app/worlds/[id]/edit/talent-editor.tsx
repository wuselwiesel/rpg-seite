"use client";

import { useActionState, useState } from "react";
import { ArrowDown, ArrowUp, Plus, RotateCcw, X } from "lucide-react";
import { saveWorldTalents } from "../../actions";
import { ATTR_TABLE } from "@/lib/charakterbogen-stats";
import { DEFAULT_TALENTS, MAX_TALENTS, MAX_TALENT_NAME, type TalentAttr, type TalentDef } from "@/lib/talents";

const field = "rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-fg outline-none focus:border-accent";
// Glück fließt in kein Talent ein
const ATTRS = ATTR_TABLE.filter((a) => a.code !== "GL");

export function TalentEditor({ worldId, initial }: { worldId: string; initial: TalentDef[] }) {
  const [rows, setRows] = useState<TalentDef[]>(initial);
  const [state, action, pending] = useActionState(saveWorldTalents.bind(null, worldId), null);

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
    <form
      action={action}
      onSubmit={(e) => {
        const removed = initial.filter((t) => !rows.some((r) => r.name.trim().toLowerCase() === t.name.toLowerCase()));
        if (removed.length > 0 && !confirm(`${removed.length} Talent(e) entfallen und verlieren ihre Punkte in den Bögen. Speichern?`)) e.preventDefault();
      }}
      className="flex flex-col gap-2"
    >
      <input type="hidden" name="talents" value={JSON.stringify(rows)} />
      <ul className="flex flex-col gap-1.5">
        {rows.map((t, i) => (
          <li key={i} className="flex flex-wrap items-center gap-1.5">
            <input
              value={t.name}
              maxLength={MAX_TALENT_NAME}
              onChange={(e) => set(i, { name: e.target.value })}
              aria-label="Name des Talents"
              className={`min-w-[8rem] flex-1 ${field}`}
            />
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
                className={field}
              >
                {ATTRS.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.name}
                  </option>
                ))}
              </select>
            ))}
            <span className="flex items-center">
              <button type="button" onClick={() => move(i, -1)} aria-label="Nach oben" className="rounded p-1 text-muted hover:bg-surface-2 hover:text-fg">
                <ArrowUp className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
              <button type="button" onClick={() => move(i, 1)} aria-label="Nach unten" className="rounded p-1 text-muted hover:bg-surface-2 hover:text-fg">
                <ArrowDown className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
              <button type="button" onClick={() => setRows((r) => r.filter((_, j) => j !== i))} aria-label="Entfernen" className="rounded p-1 text-muted hover:bg-surface-2 hover:text-red-500">
                <X className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </span>
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
      {state && state !== "ok" && <p className="text-sm text-red-600 dark:text-red-400">{state}</p>}
      {state === "ok" && <p className="text-sm text-accent">Gespeichert.</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-md bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Speichere..." : "Talente speichern"}
      </button>
    </form>
  );
}
