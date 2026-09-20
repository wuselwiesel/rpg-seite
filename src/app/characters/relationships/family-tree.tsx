"use client";

import { useId, useMemo } from "react";
import Link from "next/link";
import type { Character, CharacterRelationship } from "@/lib/types";

const NODE_W = 120;
const GAP_X = 36;
const ROW_H = 150;
const R = 26;
const HOUSE_COLORS = ["#b07a4a", "#4f7fb5", "#5b9d6f", "#c4553f", "#8a6bb5", "#3f9aa5", "#c08a2c", "#a45b8a"];

type Unit = { members: string[]; x: number };

// Stammbaum: Generationen aus Eltern-Kind-Beziehungen, Paare nebeneinander, Häuser farblich markiert.
export function FamilyTree({
  characters,
  relationships,
}: {
  characters: Character[];
  relationships: CharacterRelationship[];
}) {
  const clipBase = useId().replace(/:/g, "");
  const familyRels = relationships.filter((r) => r.category === "familie");

  const layout = useMemo(() => {
    const ids = new Set<string>();
    for (const r of familyRels) {
      ids.add(r.character_a_id);
      ids.add(r.character_b_id);
    }
    const byId = new Map(characters.map((c) => [c.id, c]));
    const people = Array.from(ids).filter((id) => byId.has(id));
    const parents = new Map<string, string[]>(); // child -> parents
    const partners: [string, string][] = [];
    const siblings: [string, string][] = [];
    const relatives: [string, string][] = [];
    for (const r of familyRels) {
      if (r.family_role === "eltern") parents.set(r.character_b_id, [...(parents.get(r.character_b_id) ?? []), r.character_a_id]);
      else if (r.family_role === "partner") partners.push([r.character_a_id, r.character_b_id]);
      else if (r.family_role === "geschwister") siblings.push([r.character_a_id, r.character_b_id]);
      else relatives.push([r.character_a_id, r.character_b_id]);
    }

    // Generationen: Kind = tiefste Eltern-Generation + 1; Paare und Geschwister teilen sich eine Generation.
    const gen = new Map<string, number>(people.map((id) => [id, 0]));
    for (let pass = 0; pass < people.length + 2; pass++) {
      let changed = false;
      for (const [child, ps] of parents) {
        const g = Math.max(...ps.map((p) => gen.get(p) ?? 0)) + 1;
        if ((gen.get(child) ?? 0) < g) {
          gen.set(child, g);
          changed = true;
        }
      }
      for (const [a, b] of [...partners, ...siblings]) {
        const g = Math.max(gen.get(a) ?? 0, gen.get(b) ?? 0);
        if (gen.get(a) !== g || gen.get(b) !== g) {
          gen.set(a, g);
          gen.set(b, g);
          changed = true;
        }
      }
      if (!changed) break;
    }

    // Paare zu Einheiten zusammenfassen.
    const unitOf = new Map<string, number>();
    const units: { members: string[]; gen: number }[] = [];
    for (const id of people) {
      if (unitOf.has(id)) continue;
      const members = [id];
      const partner = partners.find(([a, b]) => a === id || b === id);
      if (partner) {
        const other = partner[0] === id ? partner[1] : partner[0];
        if (!unitOf.has(other) && byId.has(other)) members.push(other);
      }
      const index = units.length;
      for (const m of members) unitOf.set(m, index);
      units.push({ members, gen: gen.get(id) ?? 0 });
    }

    const maxGen = Math.max(0, ...units.map((u) => u.gen));
    const rows: number[][] = Array.from({ length: maxGen + 1 }, () => []);
    units.forEach((u, i) => rows[u.gen].push(i));

    // Reihenfolge je Generation: nach dem Mittelwert der Eltern-Positionen (Barycenter), sonst nach Name.
    const xOfUnit = new Map<number, number>();
    const placed: Unit[][] = [];
    const rowWidth = (row: number[]) => row.reduce((w, i) => w + units[i].members.length * NODE_W + GAP_X, -GAP_X);
    let maxWidth = 0;
    rows.forEach((row, g) => {
      const score = (i: number) => {
        const ps = units[i].members.flatMap((m) => parents.get(m) ?? []);
        const xs = ps.map((p) => xOfUnit.get(unitOf.get(p) ?? -1)).filter((x): x is number => x !== undefined);
        return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : Infinity;
      };
      row.sort((a, b) => score(a) - score(b) || (byId.get(units[a].members[0])?.name ?? "").localeCompare(byId.get(units[b].members[0])?.name ?? ""));
      maxWidth = Math.max(maxWidth, rowWidth(row));
      void g;
    });
    const totalWidth = Math.max(maxWidth, NODE_W) + 40;
    rows.forEach((row, g) => {
      let x = (totalWidth - rowWidth(row)) / 2;
      const rowUnits: Unit[] = [];
      for (const i of row) {
        const w = units[i].members.length * NODE_W;
        xOfUnit.set(i, x + w / 2);
        rowUnits.push({ members: units[i].members, x });
        x += w + GAP_X;
      }
      placed[g] = rowUnits;
    });

    const pos = new Map<string, { x: number; y: number }>();
    placed.forEach((row, g) =>
      row.forEach((u) => u.members.forEach((m, k) => pos.set(m, { x: u.x + k * NODE_W + NODE_W / 2, y: 50 + g * ROW_H }))),
    );
    return { people, pos, parents, partners, siblings, relatives, totalWidth, height: 50 + maxGen * ROW_H + 90, byId };
  }, [characters, familyRels]);

  const houseColor = useMemo(() => {
    const houses = Array.from(new Set(characters.map((c) => c.house).filter((h): h is string => !!h))).sort();
    return new Map(houses.map((h, i) => [h, HOUSE_COLORS[i % HOUSE_COLORS.length]]));
  }, [characters]);

  if (layout.people.length === 0) {
    return (
      <p className="text-sm text-muted">
        Noch kein Stammbaum: Lege unter „Neue Beziehung“ die Art „Familie“ an und wähle „A ist Elternteil von B“, „Paar“ oder
        „Geschwister“.
      </p>
    );
  }

  const { pos, parents, partners, siblings, relatives, totalWidth, height, byId } = layout;

  // Eltern-Kind-Linien: vom Mittelpunkt der Eltern (Paar) bzw. dem einzelnen Elternteil zum Kind.
  const parentLines = Array.from(parents.entries()).flatMap(([child, ps]) => {
    const c = pos.get(child);
    const pp = ps.map((p) => pos.get(p)).filter((p): p is { x: number; y: number } => !!p);
    if (!c || pp.length === 0) return [];
    const px = pp.reduce((s, p) => s + p.x, 0) / pp.length;
    const py = pp[0].y + R + 36;
    const midY = (py + (c.y - R - 4)) / 2;
    return [{ key: child, d: `M ${px} ${py} V ${midY} H ${c.x} V ${c.y - R - 4}` }];
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-2xl bg-surface-2 p-4">
        <svg viewBox={`0 0 ${totalWidth} ${height}`} width={totalWidth} height={height} style={{ maxWidth: "none", margin: "0 auto", display: "block" }} role="img" aria-label="Stammbaum">
          <defs>
            {layout.people.map((id) => {
              const p = pos.get(id);
              return p ? (
                <clipPath key={id} id={`${clipBase}-${id}`}>
                  <circle cx={p.x} cy={p.y} r={R - 2} />
                </clipPath>
              ) : null;
            })}
          </defs>
          {parentLines.map((l) => (
            <path key={l.key} d={l.d} fill="none" className="stroke-muted" strokeWidth={2} />
          ))}
          {partners.map(([a, b], i) => {
            const pa = pos.get(a);
            const pb = pos.get(b);
            if (!pa || !pb) return null;
            return <line key={`p${i}`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke="#d0587e" strokeWidth={3} />;
          })}
          {siblings.map(([a, b], i) => {
            const pa = pos.get(a);
            const pb = pos.get(b);
            if (!pa || !pb) return null;
            const top = pa.y - R - 10;
            return <path key={`s${i}`} d={`M ${pa.x} ${pa.y - R} V ${top} H ${pb.x} V ${pb.y - R}`} fill="none" className="stroke-muted" strokeWidth={1.5} strokeDasharray="4 3" />;
          })}
          {relatives.map(([a, b], i) => {
            const pa = pos.get(a);
            const pb = pos.get(b);
            if (!pa || !pb) return null;
            return <line key={`r${i}`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} className="stroke-muted" strokeWidth={1.5} strokeDasharray="2 4" />;
          })}
          {layout.people.map((id) => {
            const c = byId.get(id);
            const p = pos.get(id);
            if (!c || !p) return null;
            const ring = c.house ? houseColor.get(c.house) : undefined;
            return (
              <Link key={id} href={`/characters/${id}`}>
                <g>
                  <circle cx={p.x} cy={p.y} r={R} className="fill-surface" stroke={ring ?? "var(--line)"} strokeWidth={ring ? 3.5 : 1.5} />
                  {c.avatar_url ? (
                    <image href={c.avatar_url} x={p.x - R + 2} y={p.y - R + 2} width={(R - 2) * 2} height={(R - 2) * 2} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clipBase}-${id})`} />
                  ) : (
                    <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" className="fill-fg text-[12px] font-medium">
                      {c.name.slice(0, 2).toUpperCase()}
                    </text>
                  )}
                  <text x={p.x} y={p.y + R + 16} textAnchor="middle" className="fill-fg text-[12px] font-medium">
                    {c.name.length > 16 ? `${c.name.slice(0, 15)}…` : c.name}
                  </text>
                  {c.house && (
                    <text x={p.x} y={p.y + R + 30} textAnchor="middle" className="fill-fg-soft text-[10px]">
                      {c.house.length > 20 ? `${c.house.slice(0, 19)}…` : c.house}
                    </text>
                  )}
                </g>
              </Link>
            );
          })}
        </svg>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-soft">
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 bg-[#d0587e]" /> Paar / Ehe</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-0.5 bg-line" /> Eltern → Kind</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 border-t border-dashed border-muted" /> Geschwister / Verwandte</span>
        {Array.from(houseColor.entries()).map(([house, color]) => (
          <span key={house} className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full border-2" style={{ borderColor: color }} /> {house}
          </span>
        ))}
      </div>
    </div>
  );
}
