"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationLinkDatum } from "d3-force";
import { Minus, Plus, RotateCcw, Search } from "lucide-react";
import { usePanZoom } from "@/lib/use-pan-zoom";
import { buildAdjacency, neighborhood } from "@/lib/relationship-graph";
import { wikiTypeColor } from "@/lib/wiki-types";
import { useWikiTypes } from "@/components/wiki-types-context";
import type { LinkEdge } from "@/lib/wiki-links";
import { WikiTypeBadge } from "@/components/wiki-type-icon";

export type GraphPage = { id: string; title: string; page_type: string | null; tags: string[]; lead: string | null };

const W = 900;
const H = 600;
const PAD = 50;
const R = 14;

type Pos = { x: number; y: number };
type SimNode = { id: string; x?: number; y?: number };

// Kraft-Layout: verlinkte Seiten rücken zusammen, Themengruppen ergeben sich von selbst.
function layout(ids: string[], edges: LinkEdge[]): Map<string, Pos> {
  const nodes: SimNode[] = ids.map((id) => ({ id }));
  const set = new Set(ids);
  const links: SimulationLinkDatum<SimNode>[] = edges.filter((e) => set.has(e.a) && set.has(e.b)).map((e) => ({ source: e.a, target: e.b }));
  const sim = forceSimulation(nodes)
    .force("link", forceLink<SimNode, SimulationLinkDatum<SimNode>>(links).id((n) => n.id).distance(90).strength(0.7))
    .force("charge", forceManyBody().strength(-320))
    .force("collide", forceCollide(R + 14))
    .force("center", forceCenter(0, 0))
    .force("x", forceX(0).strength(0.05))
    .force("y", forceY(0).strength(0.05))
    .stop();
  const ticks = Math.min(400, 120 + nodes.length * 4);
  for (let i = 0; i < ticks; i++) sim.tick();
  const xs = nodes.map((n) => n.x ?? 0);
  const ys = nodes.map((n) => n.y ?? 0);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const scale = Math.min((W - 2 * PAD) / Math.max(maxX - minX, 1), (H - 2 * PAD) / Math.max(maxY - minY, 1), 1.6);
  const out = new Map<string, Pos>();
  for (const n of nodes) out.set(n.id, { x: W / 2 + ((n.x ?? 0) - (minX + maxX) / 2) * scale, y: H / 2 + ((n.y ?? 0) - (minY + maxY) / 2) * scale });
  return out;
}

const chip = "rounded-full border px-3 py-1 text-sm transition";
const field = "rounded-lg border border-line bg-app px-3 py-2 text-sm text-fg outline-none focus:border-accent";

export function WikiGraph({ pages, edges, initialFocusId }: { pages: GraphPage[]; edges: LinkEdge[]; initialFocusId?: string | null }) {
  const byId = useMemo(() => new Map(pages.map((p) => [p.id, p])), [pages]);
  const adj = useMemo(() => buildAdjacency(edges.map((e) => ({ character_a_id: e.a, character_b_id: e.b })), new Set(pages.map((p) => p.id))), [edges, pages]);
  const tags = useMemo(() => Array.from(new Set(pages.flatMap((p) => p.tags))).sort((a, b) => a.localeCompare(b, "de")), [pages]);

  const wikiTypes = useWikiTypes();
  const [focusId, setFocusId] = useState<string | null>(initialFocusId && byId.has(initialFocusId) ? initialFocusId : null);
  const [depth, setDepth] = useState<1 | 2 | 3>(1);
  const [type, setType] = useState("");
  const [tag, setTag] = useState("");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialFocusId && byId.has(initialFocusId) ? initialFocusId : null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { view, moved, zoomBy, reset, handlers } = usePanZoom(svgRef, W, H);

  const focus = focusId && byId.has(focusId) ? focusId : null;
  const matches = (p: GraphPage) => (!type || p.page_type === type) && (!tag || p.tags.some((t) => t.toLowerCase() === tag.toLowerCase()));

  const visibleIds = useMemo(() => {
    const base = focus ? neighborhood(adj, focus, depth) : pages.filter((p) => (adj.get(p.id)?.size ?? 0) > 0).map((p) => p.id);
    return base.filter((id) => id === focus || matches(byId.get(id)!));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adj, byId, depth, focus, pages, tag, type]);

  const visibleSet = useMemo(() => new Set(visibleIds), [visibleIds]);
  const visibleEdges = useMemo(() => edges.filter((e) => visibleSet.has(e.a) && visibleSet.has(e.b)), [edges, visibleSet]);
  const pos = useMemo(() => layout(visibleIds, visibleEdges), [visibleIds, visibleEdges]);
  const orphans = useMemo(() => pages.filter((p) => (adj.get(p.id)?.size ?? 0) === 0 && matches(p)), [adj, pages, tag, type]); // eslint-disable-line react-hooks/exhaustive-deps

  const active = hoverId ?? selectedId;
  const activeNeighbors = active ? (adj.get(active) ?? new Set<string>()) : null;
  const selected = selectedId ? byId.get(selectedId) : null;
  const showAllNames = visibleIds.length <= 12 || view.scale >= 1.6;
  const hits = query.trim() ? pages.filter((p) => p.title.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6) : [];

  const typesInUse = wikiTypes.filter((t) => pages.some((p) => p.page_type === t.id));
  const outgoing = selected ? edges.filter((e) => e.kind === "link" && e.a === selected.id && !e.mutual).map((e) => e.b) : [];
  const incoming = selected ? edges.filter((e) => e.kind === "link" && e.b === selected.id && !e.mutual).map((e) => e.a) : [];
  const mutual = selected ? edges.filter((e) => e.kind === "link" && e.mutual && (e.a === selected.id || e.b === selected.id)).map((e) => (e.a === selected.id ? e.b : e.a)) : [];
  const children = selected ? edges.filter((e) => e.kind === "child" && (e.a === selected.id || e.b === selected.id)).map((e) => (e.a === selected.id ? e.b : e.a)) : [];

  function pick(id: string) {
    setSelectedId(id);
    setFocusId(id);
    setQuery("");
    reset();
  }

  const list = (title: string, ids: string[]) =>
    ids.length > 0 && (
      <div>
        <p className="text-xs font-medium text-muted">{title}</p>
        <ul className="mt-1 flex flex-wrap gap-1.5">
          {ids.map((id) => (
            <li key={id}>
              <button type="button" onClick={() => setSelectedId(id)} className="rounded-full bg-surface-2 px-2.5 py-0.5 text-sm text-fg-soft transition hover:text-accent">
                {byId.get(id)?.title}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 rounded-2xl border border-line bg-surface p-4 @xl:grid-cols-[1.4fr_1fr_1fr]">
        <div className="relative flex flex-col gap-1 text-xs text-muted">
          Seite suchen und in den Mittelpunkt stellen
          <label className="flex items-center gap-2 rounded-lg border border-line bg-app px-3 focus-within:border-accent">
            <Search className="h-4 w-4 shrink-0" strokeWidth={2} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Titel" aria-label="Seite suchen" className="w-full bg-transparent py-2 text-sm text-fg outline-none" />
          </label>
          {hits.length > 0 && (
            <ul className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-line bg-surface p-1 shadow-lg">
              {hits.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => pick(p.id)} className="w-full rounded px-2 py-1.5 text-left text-sm text-fg hover:bg-surface-2">
                    {p.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Art
          <select value={type} onChange={(e) => setType(e.target.value)} className={field}>
            <option value="">Alle</option>
            {typesInUse.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Tag
          <select value={tag} onChange={(e) => setTag(e.target.value)} className={field}>
            <option value="">Alle</option>
            {tags.map((t) => (
              <option key={t} value={t}>
                #{t}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => { setFocusId(null); reset(); }} aria-pressed={!focus} className={`${chip} ${!focus ? "border-accent bg-accent/10 text-fg" : "border-line text-fg-soft hover:border-accent"}`}>
          Ganzes Wiki
        </button>
        {focus && (
          <>
            <span className="text-sm text-muted">Um „{byId.get(focus)?.title}“, Tiefe:</span>
            {([1, 2, 3] as const).map((d) => (
              <button key={d} type="button" onClick={() => setDepth(d)} aria-pressed={depth === d} className={`${chip} ${depth === d ? "border-accent bg-accent/10 text-fg" : "border-line text-fg-soft hover:border-accent"}`}>
                {d === 1 ? "Direkt" : d === 2 ? "+ Bekannte" : "+ weiter"}
              </button>
            ))}
          </>
        )}
        <div className="ml-auto flex gap-1.5" role="group" aria-label="Zoom">
          {[
            { l: "Vergrößern", f: () => zoomBy(1.5), i: <Plus className="h-4 w-4" strokeWidth={2} /> },
            { l: "Verkleinern", f: () => zoomBy(1 / 1.5), i: <Minus className="h-4 w-4" strokeWidth={2} /> },
            { l: "Ansicht zurücksetzen", f: reset, i: <RotateCcw className="h-4 w-4" strokeWidth={2} /> },
          ].map((b) => (
            <button key={b.l} type="button" onClick={b.f} aria-label={b.l} className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-fg-soft transition hover:bg-surface-2 hover:text-fg">
              {b.i}
            </button>
          ))}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-line bg-surface-2/40">
        {visibleIds.length === 0 ? (
          <p className="p-8 text-center text-fg-soft">Noch keine Verbindungen. Verlinke Seiten mit @ oder [[Titel]], dann erscheinen sie hier.</p>
        ) : (
          <svg
            ref={svgRef}
            data-testid="graph-svg"
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label="Wiki-Graph: Seiten und ihre Verlinkungen"
            className="block w-full touch-none select-none"
            {...handlers}
            onClick={(e) => { if (e.target === e.currentTarget && !moved.current) setSelectedId(null); }}
          >
            <defs>
              <marker id="wg-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--muted)" />
              </marker>
            </defs>
            <g transform={`translate(${view.tx} ${view.ty}) scale(${view.scale})`}>
              {visibleEdges.map((e) => {
                const a = pos.get(e.a)!, b = pos.get(e.b)!;
                const on = active && (e.a === active || e.b === active);
                // Pfeilspitze am Rand des Zielknotens, nur bei einseitigen Verweisen
                const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
                const bx = e.kind === "link" && !e.mutual ? b.x - (dx / len) * (R + 3) : b.x;
                const by = e.kind === "link" && !e.mutual ? b.y - (dy / len) * (R + 3) : b.y;
                return (
                  <line
                    key={`${e.a}-${e.b}`}
                    data-edge={`${e.a}|${e.b}`}
                    x1={a.x} y1={a.y} x2={bx} y2={by}
                    stroke={on ? "var(--accent)" : "var(--muted)"}
                    strokeWidth={(on ? 2.4 : 1.4) / view.scale ** 0.5}
                    strokeDasharray={e.kind === "child" ? "5 4" : undefined}
                    opacity={active && !on ? 0.12 : 0.65}
                    markerEnd={e.kind === "link" && !e.mutual ? "url(#wg-arrow)" : undefined}
                  />
                );
              })}
              {visibleIds.map((id) => {
                const p = byId.get(id)!;
                const { x, y } = pos.get(id)!;
                const dim = active && id !== active && !activeNeighbors?.has(id);
                const isSel = id === selectedId || id === focus;
                const label = showAllNames || isSel || id === hoverId || (activeNeighbors?.has(id) && active !== null);
                return (
                  <g
                    key={id}
                    data-node={id}
                    role="button"
                    tabIndex={0}
                    aria-label={p.title}
                    transform={`translate(${x} ${y})`}
                    opacity={dim ? 0.25 : 1}
                    className="cursor-pointer outline-none"
                    onPointerEnter={() => setHoverId(id)}
                    onPointerLeave={() => setHoverId(null)}
                    onClick={(ev) => { ev.stopPropagation(); if (!moved.current) setSelectedId(id); }}
                    onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); setSelectedId(id); } }}
                  >
                    <circle r={R / view.scale ** 0.3} fill={wikiTypeColor(p.page_type, wikiTypes)} stroke={isSel ? "var(--accent)" : "var(--surface)"} strokeWidth={isSel ? 4 : 2.5} />
                    {label && (
                      <text y={R + 16} textAnchor="middle" fontSize={13 / view.scale ** 0.4} fill="var(--fg)" stroke="var(--surface)" strokeWidth={3} paintOrder="stroke" className="pointer-events-none">
                        {p.title.length > 26 ? `${p.title.slice(0, 25)}…` : p.title}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        )}
      </div>

      {typesInUse.length > 0 && (
        <ul className="flex flex-wrap gap-2 text-sm" aria-label="Legende">
          {typesInUse.map((t) => (
            <li key={t.id}>
              <button type="button" onClick={() => setType(type === t.id ? "" : t.id)} aria-pressed={type === t.id} className={`${chip} flex items-center gap-2 ${type === t.id ? "border-accent bg-accent/10 text-fg" : "border-line text-fg-soft hover:border-accent"}`}>
                <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: wikiTypeColor(t.id, wikiTypes) }} />
                {t.label}
              </button>
            </li>
          ))}
          <li className="flex items-center gap-2 px-1 text-xs text-muted">
            <span aria-hidden>→</span> einseitiger Verweis · <span aria-hidden>- - -</span> Unterseite
          </li>
        </ul>
      )}

      {selected && (
        <section aria-label="Ausgewählte Seite" className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-serif text-2xl text-fg">{selected.title}</h2>
            <WikiTypeBadge type={selected.page_type} />
          </div>
          {selected.lead && <p className="text-fg-soft">{selected.lead}</p>}
          <div className="flex flex-wrap gap-2">
            <Link href={`/wiki/${selected.id}`} className="rounded-lg bg-accent-strong px-3 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90">
              Seite öffnen
            </Link>
            {focus !== selected.id && (
              <button type="button" onClick={() => pick(selected.id)} className="rounded-lg border border-line px-3 py-1.5 text-sm text-fg-soft transition hover:border-accent hover:text-accent">
                Fokus hierhin
              </button>
            )}
          </div>
          {list("Verlinkt gegenseitig", mutual)}
          {list("Verlinkt auf", outgoing)}
          {list("Verlinkt von", incoming)}
          {list("Ober-/Unterseiten", children)}
          {mutual.length + outgoing.length + incoming.length + children.length === 0 && <p className="text-sm text-muted">Diese Seite ist noch mit keiner anderen verbunden.</p>}
        </section>
      )}

      {orphans.length > 0 && (
        <section aria-labelledby="ohne-verbindung">
          <h2 id="ohne-verbindung" className="mb-2 font-serif text-xl text-fg">
            Ohne Verbindung <span className="text-base text-muted">{orphans.length}</span>
          </h2>
          <ul className="flex flex-wrap gap-1.5">
            {orphans.map((p) => (
              <li key={p.id}>
                <Link href={`/wiki/${p.id}`} className="rounded-full bg-surface-2 px-3 py-1 text-sm text-fg-soft transition hover:text-accent">
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
