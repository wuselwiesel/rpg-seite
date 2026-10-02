"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from "d3-force";
import type { SimulationLinkDatum, SimulationNodeDatum } from "d3-force";
import type { Character, CharacterRelationship, RelationshipHistoryEntry } from "@/lib/types";
import { buildAdjacency, groupHistory, neighborhood, relationshipsAsOf } from "@/lib/relationship-graph";

const W = 800;
const H = 560;
const PAD = 70;
const NODE_R = 24;
const HOUSE_COLORS = ["#b07a4a", "#4f7fb5", "#5b9d6f", "#d0587e", "#8a6bbf", "#c4a23f", "#3f9aa6", "#c4553f"];

function houseColor(house: string | null | undefined, houses: string[]) {
  if (!house) return null;
  return HOUSE_COLORS[houses.indexOf(house) % HOUSE_COLORS.length];
}

type SimNode = SimulationNodeDatum & { id: string };
type Pos = { x: number; y: number };
type View = { k: number; x: number; y: number };

// Kraft-Layout: Verbundene Charaktere rücken zusammen, Gruppen ergeben sich von selbst.
function layout(ids: string[], rels: CharacterRelationship[]): Map<string, Pos> {
  const nodes: SimNode[] = ids.map((id) => ({ id }));
  const idSet = new Set(ids);
  const links: SimulationLinkDatum<SimNode>[] = rels
    .filter((r) => idSet.has(r.character_a_id) && idSet.has(r.character_b_id))
    .map((r) => ({ source: r.character_a_id, target: r.character_b_id }));
  const sim = forceSimulation(nodes)
    .force("link", forceLink<SimNode, SimulationLinkDatum<SimNode>>(links).id((n) => n.id).distance(95).strength(0.7))
    .force("charge", forceManyBody().strength(-340))
    .force("collide", forceCollide(NODE_R + 14))
    .force("center", forceCenter(0, 0))
    .force("x", forceX(0).strength(0.05))
    .force("y", forceY(0).strength(0.05))
    .stop();
  const ticks = Math.min(400, 120 + nodes.length * 4);
  for (let i = 0; i < ticks; i++) sim.tick();

  // In den sichtbaren Bereich einpassen.
  const xs = nodes.map((n) => n.x ?? 0);
  const ys = nodes.map((n) => n.y ?? 0);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 1), spanY = Math.max(maxY - minY, 1);
  const scale = Math.min((W - 2 * PAD) / spanX, (H - 2 * PAD) / spanY, 1.6);
  const map = new Map<string, Pos>();
  for (const n of nodes) {
    map.set(n.id, {
      x: W / 2 + ((n.x ?? 0) - (minX + maxX) / 2) * scale,
      y: H / 2 + ((n.y ?? 0) - (minY + maxY) / 2) * scale,
    });
  }
  return map;
}

export function RelationshipGraph({
  characters,
  relationships,
  initialFocusId,
  history = [],
}: {
  characters: Character[];
  relationships: CharacterRelationship[];
  initialFocusId?: string | null;
  history?: RelationshipHistoryEntry[];
}) {
  const clipBase = useId().replace(/:/g, "");
  const byId = useMemo(() => new Map(characters.map((c) => [c.id, c])), [characters]);
  const houses = useMemo(
    () => Array.from(new Set(characters.map((c) => c.house).filter((h): h is string => !!h))).sort(),
    [characters],
  );

  const startFocus = initialFocusId && byId.has(initialFocusId) ? initialFocusId : null;
  const [focusId, setFocusId] = useState<string | null>(startFocus);
  const [depth, setDepth] = useState<1 | 2>(1);
  const [house, setHouse] = useState("");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [view, setView] = useState<View>({ k: 1, x: 0, y: 0 });

  const focus = focusId && byId.has(focusId) ? focusId : null;

  // Welche Charaktere sind sichtbar?
  const { shownIds, linked } = useMemo(() => {
    const adj = buildAdjacency(relationships, new Set(byId.keys()));
    let ids: string[];
    if (focus) {
      ids = neighborhood(adj, focus, depth);
    } else {
      ids = characters.filter((c) => adj.has(c.id)).map((c) => c.id);
    }
    if (house) ids = ids.filter((id) => byId.get(id)?.house === house || id === focus);
    return { shownIds: ids, linked: adj };
  }, [characters, relationships, byId, focus, depth, house]);

  const baseRels = useMemo(() => {
    const set = new Set(shownIds);
    return relationships.filter((r) => set.has(r.character_a_id) && set.has(r.character_b_id));
  }, [relationships, shownIds]);

  // Das Layout bleibt beim Zurückspulen stabil: es wird immer aus dem heutigen Stand berechnet.
  const positions = useMemo(() => layout(shownIds, baseRels), [shownIds, baseRels]);

  // --- Zeitleiste: Stand der Beziehungen zu einem früheren Zeitpunkt ---
  const historyByRel = useMemo(() => groupHistory(history), [history]);
  const minTs = useMemo(() => {
    let min = Infinity;
    for (const list of historyByRel.values()) if (list[0]) min = Math.min(min, list[0].at);
    return min;
  }, [historyByRel]);
  const [now] = useState(() => Date.now());
  const canTravel = Number.isFinite(minTs) && minTs < now - 60_000;
  // 1000 = heute, 0 = erster Eintrag.
  const [timePos, setTimePos] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const asOf = canTravel && timePos < 1000 ? minTs + ((now - minTs) * timePos) / 1000 : null;

  const shownRels = useMemo(
    () => (asOf == null ? baseRels : relationshipsAsOf(baseRels, historyByRel, asOf)),
    [baseRels, asOf, historyByRel],
  );

  // Zum gewählten Zeitpunkt sichtbare Charaktere: solche mit Beziehung (und der Fokus).
  const renderIds = useMemo(() => {
    if (asOf == null) return shownIds;
    const withEdge = new Set(shownRels.flatMap((r) => [r.character_a_id, r.character_b_id]));
    return shownIds.filter((id) => withEdge.has(id) || id === focus);
  }, [asOf, shownIds, shownRels, focus]);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setTimePos((p) => {
        if (p >= 1000) {
          setPlaying(false);
          return 1000;
        }
        return Math.min(1000, p + 8);
      });
    }, 80);
    return () => clearInterval(timer);
  }, [playing]);

  const unconnected = useMemo(
    () => characters.filter((c) => !linked.has(c.id) && (!house || c.house === house)),
    [characters, linked, house],
  );

  const legend = useMemo(() => {
    const seen = new Map<string, string>();
    for (const rel of shownRels) if (!seen.has(rel.type)) seen.set(rel.type, rel.color);
    return Array.from(seen.entries());
  }, [shownRels]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return characters.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 8);
  }, [characters, query]);

  const active = hoverId ?? selectedId;
  const activeNeighbors = useMemo(() => {
    if (!active) return null;
    const set = new Set<string>([active]);
    for (const n of linked.get(active) ?? []) set.add(n);
    return set;
  }, [active, linked]);

  // --- Zoomen und Verschieben ---
  const svgRef = useRef<SVGSVGElement>(null);
  const pointers = useRef(new Map<number, Pos>());
  const gesture = useRef<{ dist: number; moved: boolean } | null>(null);

  function toSvg(clientX: number, clientY: number): Pos {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: ((clientX - r.left) / r.width) * W, y: ((clientY - r.top) / r.height) * H };
  }
  function zoomAt(p: Pos, factor: number) {
    setView((v) => {
      const k = Math.min(5, Math.max(0.4, v.k * factor));
      const f = k / v.k;
      return { k, x: p.x - (p.x - v.x) * f, y: p.y - (p.y - v.y) * f };
    });
  }

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(toSvg(e.clientX, e.clientY), e.deltaY < 0 ? 1.15 : 1 / 1.15);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [shownIds.length]);

  function onPointerDown(e: React.PointerEvent) {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    gesture.current = { dist: 0, moved: false };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, cur);
    const pts = Array.from(pointers.current.values());
    const r = svgRef.current!.getBoundingClientRect();
    if (pts.length === 1) {
      const dx = ((cur.x - prev.x) / r.width) * W;
      const dy = ((cur.y - prev.y) / r.height) * H;
      if (gesture.current && Math.abs(dx) + Math.abs(dy) > 0) gesture.current.moved = true;
      setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
    } else if (pts.length === 2) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (gesture.current?.dist) {
        zoomAt(toSvg((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2), dist / gesture.current.dist);
      }
      if (gesture.current) {
        gesture.current.dist = dist;
        gesture.current.moved = true;
      }
    }
  }
  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0 && gesture.current && !gesture.current.moved) {
      // Tippen auf freie Fläche hebt die Auswahl auf.
      if (e.target === e.currentTarget || (e.target as Element).getAttribute("data-bg") === "1") setSelectedId(null);
    }
  }

  function focusOn(id: string | null) {
    setFocusId(id);
    setSelectedId(null);
    setQuery("");
    setView({ k: 1, x: 0, y: 0 });
  }

  if (characters.length === 0) {
    return <p className="text-sm text-muted">Keine Charaktere in dieser Ansicht.</p>;
  }

  const selected = selectedId ? byId.get(selectedId) : null;
  const showAllLabels = shownIds.length <= 12 || view.k >= 1.6;
  const pairCount = new Map<string, number>();
  const pairIndex = new Map<string, number>();
  for (const r of shownRels) {
    const key = [r.character_a_id, r.character_b_id].sort().join("|");
    pairIndex.set(r.id, pairCount.get(key) ?? 0);
    pairCount.set(key, (pairCount.get(key) ?? 0) + 1);
  }

  const chip = (on: boolean) =>
    `rounded-full px-3 py-1 text-xs font-medium transition ${
      on ? "bg-accent-strong text-on-accent-strong" : "bg-surface text-fg-soft hover:text-fg"
    }`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" onClick={() => focusOn(null)} className={chip(!focus)}>
          Ganze Welt
        </button>
        {startFocus && (
          <button type="button" onClick={() => focusOn(startFocus)} className={chip(focus === startFocus)}>
            Mein Charakter
          </button>
        )}
        {focus && (
          <>
            <span className="mx-1 text-xs text-muted">Fokus: {byId.get(focus)?.name}</span>
            <button type="button" onClick={() => setDepth(1)} className={chip(depth === 1)}>
              Direkt
            </button>
            <button type="button" onClick={() => setDepth(2)} className={chip(depth === 2)}>
              + Bekannte
            </button>
          </>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Charakter suchen und fokussieren …"
          aria-label="Charakter suchen"
          className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-fg"
        />
        {matches.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {matches.map((c) => (
              <button key={c.id} type="button" onClick={() => focusOn(c.id)} className={chip(false)}>
                {c.name}
              </button>
            ))}
          </div>
        )}
        {houses.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => setHouse("")} className={chip(!house)}>
              Alle Häuser
            </button>
            {houses.map((h) => (
              <button key={h} type="button" onClick={() => setHouse(house === h ? "" : h)} className={chip(house === h)}>
                <span
                  className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
                  style={{ backgroundColor: houseColor(h, houses) ?? undefined }}
                />
                {h}
              </button>
            ))}
          </div>
        )}
      </div>

      {canTravel && (
        <div className="flex flex-col gap-1.5 rounded-xl bg-surface px-3 py-2.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-fg">
              {asOf == null ? "Stand: heute" : `Stand: ${new Date(asOf).toLocaleDateString("de-DE")}`}
            </span>
            <span className="flex gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (timePos >= 1000) setTimePos(0);
                  setPlaying((v) => !v);
                }}
                className="rounded-full bg-surface-2 px-2.5 py-1 text-fg-soft hover:text-fg"
              >
                {playing ? "❚❚ Pause" : "▶ Abspielen"}
              </button>
              {[
                { l: "vor 1 Monat", ms: 30 * 86400000 },
                { l: "vor 3 Monaten", ms: 90 * 86400000 },
              ].map((p) => (
                <button
                  key={p.l}
                  type="button"
                  onClick={() => {
                    setPlaying(false);
                    setTimePos(Math.max(0, Math.round(1000 - (p.ms / (now - minTs)) * 1000)));
                  }}
                  className="rounded-full bg-surface-2 px-2.5 py-1 text-fg-soft hover:text-fg"
                >
                  {p.l}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setPlaying(false);
                  setTimePos(1000);
                }}
                className="rounded-full bg-surface-2 px-2.5 py-1 text-fg-soft hover:text-fg"
              >
                Heute
              </button>
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1000}
            value={timePos}
            onChange={(e) => {
              setPlaying(false);
              setTimePos(Number(e.target.value));
            }}
            aria-label="Zeitpunkt der Beziehungen"
            className="w-full accent-[var(--accent)]"
          />
          <div className="flex justify-between text-[11px] text-muted">
            <span>{new Date(minTs).toLocaleDateString("de-DE")}</span>
            <span>heute</span>
          </div>
        </div>
      )}

      {renderIds.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">Keine Beziehungen in dieser Ansicht.</p>
      ) : (
        <div className="relative overflow-hidden rounded-xl bg-surface">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="h-auto w-full cursor-grab touch-none select-none active:cursor-grabbing"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <defs>
              {shownIds.map((id) => {
                const pos = positions.get(id);
                return pos ? (
                  <clipPath key={id} id={`${clipBase}-${id}`}>
                    <circle cx={pos.x} cy={pos.y} r={NODE_R - 2} />
                  </clipPath>
                ) : null;
              })}
            </defs>
            <rect data-bg="1" x={0} y={0} width={W} height={H} fill="transparent" />
            <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
              {shownRels.map((rel) => {
                const a = positions.get(rel.character_a_id);
                const b = positions.get(rel.character_b_id);
                if (!a || !b) return null;
                const touchesActive = rel.character_a_id === active || rel.character_b_id === active;
                const dim = !!active && !touchesActive;
                const idx = pairIndex.get(rel.id) ?? 0;
                const n = pairCount.get([rel.character_a_id, rel.character_b_id].sort().join("|")) ?? 1;
                const off = (idx - (n - 1) / 2) * 36;
                const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
                const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
                const cx = mx + (-(b.y - a.y) / len) * off;
                const cy = my + ((b.x - a.x) / len) * off;
                const hot = !!active && touchesActive;
                return (
                  <g key={rel.id} opacity={dim ? 0.1 : 1}>
                    <title>{rel.type}</title>
                    <path
                      d={`M${a.x},${a.y} Q${cx},${cy} ${b.x},${b.y}`}
                      fill="none"
                      stroke={rel.color}
                      strokeWidth={(hot ? 3.5 : 2.2) / Math.sqrt(view.k)}
                      opacity={0.8}
                    />
                    {(hot || view.k >= 2.2) && (
                      <text
                        x={(a.x + 2 * cx + b.x) / 4}
                        y={(a.y + 2 * cy + b.y) / 4}
                        textAnchor="middle"
                        className="fill-fg-soft"
                        style={{ fontSize: 10 / Math.sqrt(view.k), paintOrder: "stroke", stroke: "var(--surface)", strokeWidth: 3 }}
                      >
                        {rel.type}
                      </text>
                    )}
                  </g>
                );
              })}
              {renderIds.map((id) => {
                const c = byId.get(id);
                const pos = positions.get(id);
                if (!c || !pos) return null;
                const dim = activeNeighbors && !activeNeighbors.has(id);
                const ring = houseColor(c.house, houses);
                const label = showAllLabels || id === focus || id === active || !!activeNeighbors?.has(id);
                return (
                  <g
                    key={id}
                    opacity={dim ? 0.18 : 1}
                    className="cursor-pointer"
                    onPointerEnter={(e) => e.pointerType === "mouse" && setHoverId(id)}
                    onPointerLeave={() => setHoverId(null)}
                    onClick={() => setSelectedId(id === selectedId ? null : id)}
                  >
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={NODE_R + (id === focus ? 3 : 0)}
                      className="fill-surface-2"
                      stroke={ring ?? "var(--line)"}
                      strokeWidth={ring || id === focus ? 3 : 1.5}
                    />
                    {c.avatar_url ? (
                      <image
                        href={c.avatar_url}
                        x={pos.x - NODE_R + 2}
                        y={pos.y - NODE_R + 2}
                        width={(NODE_R - 2) * 2}
                        height={(NODE_R - 2) * 2}
                        preserveAspectRatio="xMidYMid slice"
                        clipPath={`url(#${clipBase}-${id})`}
                      />
                    ) : (
                      <text x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle" className="fill-fg text-[11px] font-medium">
                        {c.name.slice(0, 2).toUpperCase()}
                      </text>
                    )}
                    {label && (
                      <text
                        x={pos.x}
                        y={pos.y + NODE_R + 14}
                        textAnchor="middle"
                        className="fill-fg-soft"
                        style={{ fontSize: 11, paintOrder: "stroke", stroke: "var(--surface)", strokeWidth: 3 }}
                      >
                        {c.name}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
          <div className="absolute right-2 top-2 flex flex-col gap-1">
            {[
              { l: "+", f: () => zoomAt({ x: W / 2, y: H / 2 }, 1.3), a: "Hineinzoomen" },
              { l: "−", f: () => zoomAt({ x: W / 2, y: H / 2 }, 1 / 1.3), a: "Herauszoomen" },
              { l: "⟲", f: () => setView({ k: 1, x: 0, y: 0 }), a: "Ansicht zurücksetzen" },
            ].map((b) => (
              <button
                key={b.a}
                type="button"
                onClick={b.f}
                aria-label={b.a}
                className="h-8 w-8 rounded-lg bg-surface-2 text-base text-fg-soft shadow-sm transition hover:text-fg"
              >
                {b.l}
              </button>
            ))}
          </div>
        </div>
      )}

      {selected && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-surface p-3 text-sm">
          <span className="font-medium text-fg">{selected.name}</span>
          {selected.house && <span className="text-xs text-muted">{selected.house}</span>}
          <span className="text-xs text-muted">· {linked.get(selected.id)?.size ?? 0} Beziehungen</span>
          <span className="flex-1" />
          {selected.id !== focus && (
            <button type="button" onClick={() => focusOn(selected.id)} className={chip(true)}>
              Fokus hierhin
            </button>
          )}
          <Link href={`/characters/${selected.id}`} className={chip(false)}>
            Profil
          </Link>
        </div>
      )}

      {legend.length > 0 && (
        <div className="flex flex-wrap justify-center gap-3">
          {legend.map(([type, color]) => (
            <span key={type} className="flex items-center gap-1.5 text-xs text-fg-soft">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
              {type}
            </span>
          ))}
        </div>
      )}

      {!focus && unconnected.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs text-muted">Noch ohne Beziehung ({unconnected.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {unconnected.map((c) => (
              <Link key={c.id} href={`/characters/${c.id}`} className={chip(false)}>
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
