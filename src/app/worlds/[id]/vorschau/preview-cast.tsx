"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

export type PreviewCastRow = { id: string; name: string; age_text: string | null; species_text: string | null; source: string | null; description: string | null; deceased: boolean; status: "free" | "reserved" | "taken" | "npc" };

const LABEL = { free: "Frei", reserved: "Reserviert", taken: "Vergeben", npc: "NPC" } as const;
const PAGE = 60;

// Besetzung zum Ansehen vor dem Beitritt: suchen und nach Stand filtern, ohne Namen der Spieler:innen
export function PreviewCast({ rows }: { rows: PreviewCastRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"" | keyof typeof LABEL>("");
  const [shown, setShown] = useState(PAGE);
  const counts = useMemo(() => {
    const c = { free: 0, reserved: 0, taken: 0, npc: 0 };
    for (const r of rows) c[r.status] += 1;
    return c;
  }, [rows]);
  const q = query.trim().toLocaleLowerCase("de");
  const visible = rows.filter((r) => (!status || r.status === status) && (!q || r.name.toLocaleLowerCase("de").includes(q) || (r.species_text ?? "").toLocaleLowerCase("de").includes(q)));

  return (
    <div className="flex flex-col gap-3">
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={2} />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShown(PAGE);
          }}
          placeholder="Name oder Wesen suchen"
          aria-label="Rolle suchen"
          className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-sm text-fg outline-none focus:border-accent"
        />
      </label>
      <div role="group" aria-label="Stand" className="flex flex-wrap gap-1.5">
        {(Object.keys(LABEL) as (keyof typeof LABEL)[])
          .filter((s) => counts[s] > 0)
          .map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={status === s}
              onClick={() => {
                setStatus(status === s ? "" : s);
                setShown(PAGE);
              }}
              className={`rounded-full border px-3 py-1 text-sm transition ${status === s ? "border-accent bg-accent/10 font-medium text-accent" : "border-line text-fg-soft hover:border-accent hover:text-accent"}`}
            >
              {LABEL[s]} <span className="text-xs opacity-70">{counts[s]}</span>
            </button>
          ))}
      </div>
      {visible.length === 0 ? (
        <p className="text-sm text-muted">Nichts gefunden.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface">
          {visible.slice(0, shown).map((r) => (
            <li key={r.id} className="flex items-start gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-fg">
                  {r.deceased && <span className="mr-1 text-muted">†</span>}
                  {r.name}
                </p>
                <p className="flex flex-wrap gap-x-2 text-xs text-muted">
                  {r.age_text && <span>{r.age_text}</span>}
                  {r.species_text && <span>{r.species_text}</span>}
                  {r.source && <span>{r.source}</span>}
                </p>
                {r.description && <p className="mt-1 line-clamp-2 text-sm text-fg-soft">{r.description}</p>}
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${r.status === "free" ? "bg-accent/15 text-accent" : "bg-surface-2 text-fg-soft"}`}>{LABEL[r.status]}</span>
            </li>
          ))}
        </ul>
      )}
      {visible.length > shown && (
        <button type="button" onClick={() => setShown((n) => n + PAGE)} className="mx-auto rounded-full border border-line px-4 py-2 text-sm font-medium text-fg-soft transition hover:border-accent hover:text-accent">
          Mehr anzeigen ({visible.length - shown} weitere)
        </button>
      )}
    </div>
  );
}
