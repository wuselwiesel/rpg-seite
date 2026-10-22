"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Search } from "lucide-react";
import { CharacterAvatar } from "@/components/character-avatar";
import { PdfButton } from "@/components/pdf-button";
import type { FigureRow } from "@/lib/character-list-data";

type Key = "name" | "age" | "species" | "house" | "kind";
const COLUMNS: { key: Key; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "age", label: "Alter" },
  { key: "species", label: "Wesen" },
  { key: "house", label: "Haus" },
  { key: "kind", label: "Art" },
];

// Zahl vorn im Alter („22 (augenscheinlich)“, „18 Jahre“) für die Sortierung
const ageNumber = (age: string) => {
  const m = age.match(/\d+/);
  return m ? Number(m[0]) : 100000;
};

const select = "rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-fg outline-none focus:border-accent";

// Gesamtliste aller Figuren: sortieren (Spaltenkopf antippen), suchen, filtern, als PDF speichern (Druckdialog).
export function FiguresTable({ rows, worldName }: { rows: FigureRow[]; worldName: string }) {
  const [q, setQ] = useState("");
  const [species, setSpecies] = useState("");
  const [house, setHouse] = useState("");
  const [kind, setKind] = useState("");
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "name", dir: 1 });

  const speciesOptions = useMemo(() => [...new Set(rows.map((r) => r.species).filter(Boolean))].sort((a, b) => a.localeCompare(b, "de")), [rows]);
  const houseOptions = useMemo(() => [...new Set(rows.map((r) => r.house).filter(Boolean))].sort((a, b) => a.localeCompare(b, "de")), [rows]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = rows.filter(
      (r) =>
        (!needle || `${r.name} ${r.species} ${r.house} ${r.age}`.toLowerCase().includes(needle)) &&
        (!species || r.species === species) &&
        (!house || r.house === house) &&
        (!kind || r.kind === kind),
    );
    return filtered.sort((a, b) => {
      // leere Angaben stehen immer unten
      const ea = a[sort.key] === "" ? 1 : 0;
      const eb = b[sort.key] === "" ? 1 : 0;
      if (ea !== eb) return ea - eb;
      const c =
        sort.key === "age"
          ? (ageNumber(a.age) - ageNumber(b.age) || a.age.localeCompare(b.age, "de")) * sort.dir
          : a[sort.key].localeCompare(b[sort.key], "de") * sort.dir;
      return c || a.name.localeCompare(b.name, "de");
    });
  }, [rows, q, species, house, kind, sort]);

  return (
    <div className="flex flex-col gap-4">
      <div className="no-print flex flex-wrap items-center gap-2">
        <label className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={2} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Suchen" aria-label="Suchen" className={`${select} w-full pl-9`} />
        </label>
        <select value={species} onChange={(e) => setSpecies(e.target.value)} aria-label="Wesen" className={select}>
          <option value="">Alle Wesen</option>
          {speciesOptions.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select value={house} onChange={(e) => setHouse(e.target.value)} aria-label="Haus" className={select}>
          <option value="">Alle Häuser</option>
          {houseOptions.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Art" className={select}>
          <option value="">Alle Arten</option>
          <option>Spielfigur</option>
          <option>NPC</option>
          <option>Frei</option>
        </select>
        <PdfButton />
      </div>

      <h2 className="hidden font-serif text-2xl text-fg print:block">
        Figuren von {worldName} ({shown.length})
      </h2>

      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-2/60">
              {COLUMNS.map((c) => (
                <th key={c.key} scope="col" aria-sort={sort.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : "none"} className="px-3 py-2 font-medium text-fg-soft">
                  <button type="button" onClick={() => setSort((s) => (s.key === c.key ? { key: c.key, dir: s.dir === 1 ? -1 : 1 } : { key: c.key, dir: 1 }))} className="flex items-center gap-1 hover:text-fg">
                    {c.label}
                    {sort.key === c.key && (sort.dir === 1 ? <ArrowUp className="h-3.5 w-3.5" strokeWidth={2} /> : <ArrowDown className="h-3.5 w-3.5" strokeWidth={2} />)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0">
                <td className="px-3 py-2">
                  <Link href={r.wikiId ? `/wiki/${r.wikiId}` : `/characters/${r.id}`} className="flex items-center gap-2.5 text-fg transition hover:text-accent">
                    <CharacterAvatar name={r.name} avatarUrl={r.avatarUrl} size={28} />
                    <span className="min-w-0">{r.name}</span>
                  </Link>
                </td>
                <td className="px-3 py-2 text-fg-soft">{r.age}</td>
                <td className="px-3 py-2 text-fg-soft">{r.species}</td>
                <td className="px-3 py-2 text-fg-soft">{r.house}</td>
                <td className="px-3 py-2 text-fg-soft">{r.kind}</td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="px-3 py-6 text-center text-muted">
                  Keine Figur gefunden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="no-print text-xs text-muted">{shown.length} von {rows.length} Figuren</p>
    </div>
  );
}
