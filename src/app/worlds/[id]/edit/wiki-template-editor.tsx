"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Lock, Plus, Trash2 } from "lucide-react";
import { MAX_TEMPLATE_FIELDS, type TemplateField } from "@/lib/wiki-template";
import { cleanFieldIcon } from "@/lib/profile-fields";

const field = "rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent";
type Row = TemplateField & { key: number };

// Vorlage der Wiki-Einträge von Figuren: Felder, die jeder Eintrag zu Beginn hat (öffentlich oder geheim). Schreibt JSON in character_wiki_template.
export function WikiTemplateEditor({ initial }: { initial: TemplateField[] }) {
  const [rows, setRows] = useState<Row[]>(() => initial.map((f, i) => ({ ...f, key: i })));
  const [nextKey, setNextKey] = useState(initial.length + 1);
  const update = (key: number, patch: Partial<TemplateField>) => setRows((r) => r.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  const move = (i: number, dir: -1 | 1) =>
    setRows((r) => {
      const t = i + dir;
      if (t < 0 || t >= r.length) return r;
      const copy = [...r];
      [copy[i], copy[t]] = [copy[t], copy[i]];
      return copy;
    });
  return (
    <details className="rounded-lg border border-line p-3">
      <summary className="cursor-pointer text-sm text-fg">
        Felder der Wiki-Einträge (Vorlage) <span className="text-muted">{rows.length}</span>
      </summary>
      <div className="mt-3 flex flex-col gap-2">
        <input type="hidden" name="character_wiki_template" value={JSON.stringify(rows.map((r) => ({ icon: r.icon, title: r.title, secret: r.secret })))} />
        {rows.map((row, i) => (
          <div key={row.key} className="flex items-center gap-2">
            <input value={row.icon} onChange={(e) => update(row.key, { icon: cleanFieldIcon(e.target.value) })} placeholder="🙂" aria-label="Symbol" className={`w-14 text-center ${field}`} />
            <input value={row.title} maxLength={40} onChange={(e) => update(row.key, { title: e.target.value })} placeholder="Titel, z. B. Beruf" aria-label="Titel" className={`min-w-0 flex-1 ${field}`} />
            <label className="flex shrink-0 items-center gap-1.5 text-sm text-fg-soft">
              <input type="checkbox" checked={row.secret} onChange={(e) => update(row.key, { secret: e.target.checked })} className="h-4 w-4 accent-[var(--accent-strong)]" />
              <Lock className="h-3.5 w-3.5" strokeWidth={2} />
              Geheim
            </label>
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Nach oben" className="rounded p-1.5 text-muted transition hover:bg-surface-2 hover:text-fg disabled:opacity-30">
              <ArrowUp className="h-4 w-4" strokeWidth={2} />
            </button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="Nach unten" className="rounded p-1.5 text-muted transition hover:bg-surface-2 hover:text-fg disabled:opacity-30">
              <ArrowDown className="h-4 w-4" strokeWidth={2} />
            </button>
            <button type="button" onClick={() => setRows((r) => r.filter((x) => x.key !== row.key))} aria-label="Feld entfernen" className="rounded p-1.5 text-muted transition hover:bg-surface-2 hover:text-red-500">
              <Trash2 className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        ))}
        {rows.length < MAX_TEMPLATE_FIELDS && (
          <button
            type="button"
            onClick={() => {
              setRows((r) => [...r, { icon: "", title: "", secret: false, key: nextKey }]);
              setNextKey((k) => k + 1);
            }}
            className="flex w-fit items-center gap-1.5 rounded-md bg-surface-2 px-3 py-1.5 text-sm font-medium text-fg-soft transition hover:text-fg"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Feld hinzufügen
          </button>
        )}
      </div>
    </details>
  );
}
