"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Compass,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Image as ImageIcon,
  LayoutGrid,
  Link2,
  List,
  Minus,
  PanelTop,
  Plus,
  Search,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { AvatarUpload } from "@/components/avatar-upload";
import { EmojiHtml } from "@/components/custom-emoji-provider";
import { RichTextEditor } from "@/components/rich-text-editor";
import { BLOCK_TYPES, LIST_SOURCES, MAX_BLOCKS, MAX_LINKS, MAX_TILES, newBlock, type BlockType, type HomeBlock, type Tile, type WikiHome } from "@/lib/wiki-home";
import { saveWikiHome } from "../home-actions";

export type TileOption = { kind: Tile["kind"]; id: string; title: string };

const field = "w-full rounded-lg border border-line bg-app px-3 py-2 text-sm text-fg outline-none focus:border-accent";
const KIND_LABEL: Record<Tile["kind"], string> = { page: "Artikel", folder: "Ordner", map: "Karte" };
const TYPE_LABEL = Object.fromEntries(BLOCK_TYPES.map((b) => [b.type, b.label])) as Record<BlockType, string>;
const TYPE_ICON: Record<BlockType, typeof Type> = {
  hero: PanelTop,
  text: Type,
  tiles: LayoutGrid,
  list: List,
  image: ImageIcon,
  links: Link2,
  divider: Minus,
  search: Search,
  shortcuts: Compass,
};
// Aktions-Symbole: mit Maus beim Darüberfahren, am Handy nach Antippen des Bausteins
const REVEAL =
  "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/blk:opacity-100 [@media(hover:hover)]:focus-within:opacity-100 [@media(hover:none)]:pointer-events-none [@media(hover:none)]:opacity-0 [@media(hover:none)]:group-data-[tapped]/blk:pointer-events-auto [@media(hover:none)]:group-data-[tapped]/blk:opacity-100";
const iconBtn = "rounded-full p-1.5 text-muted transition hover:bg-surface-2 hover:text-fg disabled:opacity-30";
const pill = (on: boolean) => `rounded-full px-3 py-1 text-xs font-medium transition ${on ? "bg-accent-strong text-on-accent-strong" : "bg-surface-2 text-fg-soft hover:text-fg"}`;

function plain(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function summary(b: HomeBlock, options: TileOption[]): string {
  switch (b.type) {
    case "hero":
      return [b.title, b.subtitle].filter(Boolean).join(" – ") || (b.image ? "Mit Bild" : "Name der Welt");
    case "text":
      return b.title || plain(b.html).slice(0, 70) || "Noch leer";
    case "tiles":
      return `${b.title ? `${b.title} · ` : ""}${b.items.length} ${b.items.length === 1 ? "Eintrag" : "Einträge"}`;
    case "list":
      return b.title || LIST_SOURCES.find((s) => s.id === b.source)?.label || "";
    case "image":
      return b.caption || (b.image ? "Bild" : "Noch kein Bild");
    case "links":
      return b.items.filter((l) => l.label).map((l) => l.label).join(", ") || "Noch keine Knöpfe";
    case "divider":
      return b.style === "line" ? "Linie" : "Abstand";
    default:
      void options;
      return "";
  }
}

export function HomeEditor({ worldId, initial, hasHome, options }: { worldId: string; initial: WikiHome; hasHome: boolean; options: TileOption[] }) {
  const router = useRouter();
  const [blocks, setBlocks] = useState<HomeBlock[]>(initial.blocks);
  const [open, setOpen] = useState<Set<string>>(() => new Set(initial.blocks.length <= 1 ? initial.blocks.map((b) => b.id) : []));
  const [tapped, setTapped] = useState<string | null>(null);
  const [palette, setPalette] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const patch = (id: string, next: Partial<HomeBlock>) => setBlocks((cur) => cur.map((b) => (b.id === id ? ({ ...b, ...next } as HomeBlock) : b)));
  const toggleOpen = (id: string) =>
    setOpen((cur) => {
      const n = new Set(cur);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const reorder = (from: number, to: number) =>
    setBlocks((cur) => {
      if (from === to || from < 0 || to < 0 || from >= cur.length || to >= cur.length) return cur;
      const next = [...cur];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  function insert(type: BlockType, at: number) {
    const b = newBlock(type);
    setBlocks((cur) => [...cur.slice(0, at), b, ...cur.slice(at)]);
    setOpen((cur) => new Set(cur).add(b.id));
    setPalette(null);
  }
  function duplicate(i: number) {
    const src = blocks[i];
    const copy = { ...structuredClone(src), id: Math.random().toString(36).slice(2, 10) } as HomeBlock;
    setBlocks((cur) => [...cur.slice(0, i + 1), copy, ...cur.slice(i + 1)]);
    setOpen((cur) => new Set(cur).add(copy.id));
  }

  function submit(payload: WikiHome | null) {
    setError(null);
    start(async () => {
      const err = await saveWikiHome(worldId, JSON.stringify(payload));
      if (err) setError(err);
      else router.push("/wiki");
    });
  }

  const full = blocks.length >= MAX_BLOCKS;

  return (
    <div className="flex flex-col gap-4">
      <header className="sticky top-0 z-20 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-app/95 px-4 py-3 backdrop-blur">
        <h1 className="font-serif text-2xl text-fg">Startseite</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="Ansicht" className="flex rounded-full bg-surface-2 p-0.5 lg:hidden">
            <button type="button" role="tab" aria-selected={mobileView === "edit"} onClick={() => setMobileView("edit")} className={pill(mobileView === "edit")}>
              Bearbeiten
            </button>
            <button type="button" role="tab" aria-selected={mobileView === "preview"} onClick={() => setMobileView("preview")} className={pill(mobileView === "preview")}>
              Vorschau
            </button>
          </div>
          <Link href="/wiki" className="rounded-lg px-3 py-2 text-sm text-fg-soft transition hover:bg-surface-2 hover:text-fg">
            Abbrechen
          </Link>
          <button
            type="button"
            disabled={pending || blocks.length === 0}
            onClick={() => submit({ blocks })}
            className="rounded-lg bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Speichere..." : "Speichern"}
          </button>
        </div>
      </header>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <div className={`flex flex-col gap-1 ${mobileView === "preview" ? "hidden lg:flex" : ""}`}>
          {blocks.length === 0 && <Palette onPick={(t) => insert(t, 0)} />}
          {blocks.map((b, i) => {
            const Icon = TYPE_ICON[b.type];
            const expanded = open.has(b.id);
            return (
              <div key={b.id} className="flex flex-col">
                <InsertSlot disabled={full} active={palette === i} onToggle={() => setPalette(palette === i ? null : i)}>
                  <Palette onPick={(t) => insert(t, i)} />
                </InsertSlot>
                <div
                  data-tapped={tapped === b.id ? "" : undefined}
                  onClick={(e) => {
                    if (!window.matchMedia("(hover: none)").matches) return;
                    if ((e.target as HTMLElement).closest("button, input, textarea, select, [contenteditable], a")) return;
                    setTapped((v) => (v === b.id ? null : b.id));
                  }}
                  onDragOver={(e) => {
                    if (dragIndex === null) return;
                    e.preventDefault();
                    setOverIndex(i);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragIndex !== null) reorder(dragIndex, i);
                    setDragIndex(null);
                    setOverIndex(null);
                  }}
                  className={`group/blk rounded-2xl border bg-surface transition ${overIndex === i && dragIndex !== null && dragIndex !== i ? "border-accent" : "border-line"} ${b.hidden ? "opacity-60" : ""} ${dragIndex === i ? "opacity-40" : ""}`}
                >
                  <div className="flex items-center gap-1 p-2">
                    <span
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "move";
                        setDragIndex(i);
                      }}
                      onDragEnd={() => {
                        setDragIndex(null);
                        setOverIndex(null);
                      }}
                      title="Ziehen zum Verschieben"
                      aria-hidden
                      className="hidden cursor-grab touch-none rounded-lg p-1.5 text-muted hover:bg-surface-2 active:cursor-grabbing [@media(hover:hover)]:block"
                    >
                      <GripVertical className="h-4 w-4" strokeWidth={2} />
                    </span>
                    <button type="button" onClick={() => toggleOpen(b.id)} aria-expanded={expanded} className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1.5 py-1 text-left">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-accent">
                        <Icon className="h-4 w-4" strokeWidth={2} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-fg">
                          {TYPE_LABEL[b.type]}
                          {b.hidden && <span className="ml-2 text-xs font-normal text-muted">ausgeblendet</span>}
                        </span>
                        <span className="block truncate text-xs text-muted">{summary(b, options)}</span>
                      </span>
                      <ChevronDown className={`h-4 w-4 shrink-0 text-muted transition ${expanded ? "rotate-180" : ""}`} strokeWidth={2} />
                    </button>
                    <div className={`flex shrink-0 items-center ${REVEAL}`}>
                      <button type="button" aria-label="Nach oben" title="Nach oben" disabled={i === 0} onClick={() => reorder(i, i - 1)} className={iconBtn}>
                        <ArrowUp className="h-4 w-4" strokeWidth={2} />
                      </button>
                      <button type="button" aria-label="Nach unten" title="Nach unten" disabled={i === blocks.length - 1} onClick={() => reorder(i, i + 1)} className={iconBtn}>
                        <ArrowDown className="h-4 w-4" strokeWidth={2} />
                      </button>
                      <button type="button" aria-label="Duplizieren" title="Duplizieren" disabled={full} onClick={() => duplicate(i)} className={iconBtn}>
                        <Copy className="h-4 w-4" strokeWidth={2} />
                      </button>
                      <button type="button" aria-label={b.hidden ? "Einblenden" : "Ausblenden"} title={b.hidden ? "Einblenden" : "Ausblenden"} onClick={() => patch(b.id, { hidden: !b.hidden })} className={iconBtn}>
                        {b.hidden ? <Eye className="h-4 w-4" strokeWidth={2} /> : <EyeOff className="h-4 w-4" strokeWidth={2} />}
                      </button>
                      <button type="button" aria-label="Baustein löschen" title="Löschen" onClick={() => setBlocks((cur) => cur.filter((x) => x.id !== b.id))} className={`${iconBtn} hover:text-red-500`}>
                        <Trash2 className="h-4 w-4" strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                  {expanded && (
                    <div className="border-t border-line p-3">
                      <BlockFields block={b} options={options} onPatch={(p) => patch(b.id, p)} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {blocks.length > 0 && (
            <div className="mt-1 flex flex-col">
              <InsertSlot disabled={full} active={palette === blocks.length} onToggle={() => setPalette(palette === blocks.length ? null : blocks.length)} always>
                <Palette onPick={(t) => insert(t, blocks.length)} />
              </InsertSlot>
            </div>
          )}
          {hasHome && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (window.confirm("Startseite zurücksetzen? Danach erscheint wieder die Standard-Vorbelegung.")) submit(null);
              }}
              className="mt-4 w-fit text-sm text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
            >
              Startseite zurücksetzen
            </button>
          )}
        </div>

        <aside aria-label="Vorschau" className={`lg:sticky lg:top-20 ${mobileView === "edit" ? "hidden lg:block" : ""}`}>
          <div className="max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-2xl border border-line bg-app p-4 [scrollbar-width:thin]">
            <Preview blocks={blocks} options={options} />
          </div>
        </aside>
      </div>
    </div>
  );
}

// Einfüge-Stelle zwischen den Bausteinen: dünne Zeile mit „+“, klappt die Auswahl auf
function InsertSlot({ children, active, onToggle, disabled, always }: { children: React.ReactNode; active: boolean; onToggle: () => void; disabled: boolean; always?: boolean }) {
  if (disabled && !active) return <div className="h-2" />;
  return (
    <div className="group/ins flex flex-col">
      <div className={`flex items-center justify-center ${always ? "py-1" : "h-2 [@media(hover:hover)]:hover:h-7"} transition-all ${active ? "h-auto py-1" : ""}`}>
        <button
          type="button"
          onClick={onToggle}
          aria-label="Baustein einfügen"
          title="Baustein einfügen"
          className={`inline-flex items-center gap-1 rounded-full border border-dashed border-line px-3 py-0.5 text-xs text-muted transition hover:border-accent hover:text-accent ${always || active ? "" : "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/ins:opacity-100 [@media(hover:none)]:hidden"}`}
        >
          <Plus className="h-3 w-3" strokeWidth={2.5} />
          Baustein
        </button>
      </div>
      {active && <div className="mb-2">{children}</div>}
    </div>
  );
}

function Palette({ onPick }: { onPick: (t: BlockType) => void }) {
  return (
    <div role="group" aria-label="Baustein wählen" className="grid grid-cols-2 gap-2 rounded-2xl border border-line bg-surface-2/50 p-2 sm:grid-cols-3">
      {BLOCK_TYPES.map((t) => {
        const Icon = TYPE_ICON[t.type];
        return (
          <button
            key={t.type}
            type="button"
            onClick={() => onPick(t.type)}
            className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2.5 text-left text-sm text-fg-soft transition hover:border-accent hover:text-accent"
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function Segment<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-muted">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button key={String(o.value)} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)} className={pill(value === o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function BlockFields({ block: b, options, onPatch }: { block: HomeBlock; options: TileOption[]; onPatch: (p: Partial<HomeBlock>) => void }) {
  switch (b.type) {
    case "hero":
      return (
        <div className="flex flex-col gap-3">
          <input value={b.title} onChange={(e) => onPatch({ title: e.target.value })} maxLength={120} placeholder="Überschrift (leer = Name der Welt)" aria-label="Überschrift" className={field} />
          <input value={b.subtitle} onChange={(e) => onPatch({ subtitle: e.target.value })} maxLength={240} placeholder="Untertitel" aria-label="Untertitel" className={field} />
          <AvatarUpload name={`hero-${b.id}`} initialUrl={b.image} displayName="Titelbild" bucket="wiki-covers" variant="cover" onChange={(url) => onPatch({ image: url })} />
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <Segment label="Ausrichtung" value={b.align} options={[{ value: "left", label: "Links" }, { value: "center", label: "Mitte" }]} onChange={(align) => onPatch({ align })} />
            <Segment label="Höhe" value={b.size} options={[{ value: "s", label: "Flach" }, { value: "m", label: "Mittel" }, { value: "l", label: "Hoch" }]} onChange={(size) => onPatch({ size })} />
          </div>
        </div>
      );
    case "text":
      return (
        <div className="flex flex-col gap-3">
          <input value={b.title} onChange={(e) => onPatch({ title: e.target.value })} maxLength={120} placeholder="Überschrift" aria-label="Überschrift" className={field} />
          <RichTextEditor name={`text-${b.id}`} initialContent={b.html} onChange={(html) => onPatch({ html })} minHeight={140} showToolbar />
        </div>
      );
    case "tiles":
      return <TilesFields block={b} options={options} onPatch={onPatch} />;
    case "list":
      return (
        <div className="flex flex-col gap-3">
          <input value={b.title} onChange={(e) => onPatch({ title: e.target.value })} maxLength={120} placeholder="Überschrift (leer = Name der Liste)" aria-label="Überschrift" className={field} />
          <Segment label="Inhalt" value={b.source} options={LIST_SOURCES.map((s) => ({ value: s.id, label: s.label }))} onChange={(source) => onPatch({ source })} />
          <Segment label="Anzahl" value={b.count} options={[3, 4, 6, 8, 10, 12].map((n) => ({ value: n, label: String(n) }))} onChange={(count) => onPatch({ count })} />
        </div>
      );
    case "image":
      return (
        <div className="flex flex-col gap-3">
          <AvatarUpload name={`image-${b.id}`} initialUrl={b.image} displayName="Bild" bucket="wiki-covers" variant="standard" onChange={(url) => onPatch({ image: url })} />
          <input value={b.caption} onChange={(e) => onPatch({ caption: e.target.value })} maxLength={200} placeholder="Bildunterschrift" aria-label="Bildunterschrift" className={field} />
          <Segment label="Breite" value={b.width} options={[{ value: "full", label: "Volle Breite" }, { value: "narrow", label: "Schmal" }]} onChange={(width) => onPatch({ width })} />
        </div>
      );
    case "links":
      return (
        <div className="flex flex-col gap-3">
          <input value={b.title} onChange={(e) => onPatch({ title: e.target.value })} maxLength={120} placeholder="Überschrift" aria-label="Überschrift" className={field} />
          <ul className="flex flex-col gap-2">
            {b.items.map((l, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2">
                <input
                  value={l.label}
                  onChange={(e) => onPatch({ items: b.items.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })}
                  maxLength={60}
                  placeholder="Beschriftung"
                  aria-label="Beschriftung"
                  className={`${field} min-w-[8rem] flex-1`}
                />
                <input
                  value={l.url}
                  onChange={(e) => onPatch({ items: b.items.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })}
                  maxLength={600}
                  placeholder="https://… oder /wiki/…"
                  aria-label="Adresse"
                  className={`${field} min-w-[10rem] flex-[2]`}
                />
                <button type="button" aria-label="Knopf entfernen" onClick={() => onPatch({ items: b.items.filter((_, j) => j !== i) })} className={`${iconBtn} hover:text-red-500`}>
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              </li>
            ))}
          </ul>
          {b.items.length < MAX_LINKS && (
            <button type="button" onClick={() => onPatch({ items: [...b.items, { label: "", url: "" }] })} className="inline-flex w-fit items-center gap-1 rounded-full border border-dashed border-line px-3 py-1 text-sm text-muted transition hover:border-accent hover:text-accent">
              <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
              Knopf
            </button>
          )}
        </div>
      );
    case "divider":
      return <Segment label="Art" value={b.style} options={[{ value: "line", label: "Linie" }, { value: "space", label: "Abstand" }]} onChange={(style) => onPatch({ style })} />;
    default:
      return null;
  }
}

function TilesFields({ block: b, options, onPatch }: { block: Extract<HomeBlock, { type: "tiles" }>; options: TileOption[]; onPatch: (p: Partial<HomeBlock>) => void }) {
  const [q, setQ] = useState("");
  const chosen = new Set(b.items.map((t) => `${t.kind}:${t.id}`));
  const matches = options.filter((o) => !chosen.has(`${o.kind}:${o.id}`) && (!q.trim() || o.title.toLowerCase().includes(q.trim().toLowerCase()))).slice(0, 8);
  const titleOf = (t: Tile) => options.find((o) => o.kind === t.kind && o.id === t.id)?.title ?? "Nicht mehr vorhanden";
  return (
    <div className="flex flex-col gap-3">
      <input value={b.title} onChange={(e) => onPatch({ title: e.target.value })} maxLength={120} placeholder="Überschrift" aria-label="Überschrift" className={field} />
      <Segment label="Spalten" value={b.columns} options={[{ value: 2 as const, label: "2" }, { value: 3 as const, label: "3" }, { value: 4 as const, label: "4" }]} onChange={(columns) => onPatch({ columns })} />
      {b.items.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {b.items.map((t) => (
            <li key={`${t.kind}:${t.id}`} className="flex items-center gap-1 rounded-full bg-surface-2 py-1 pl-3 pr-1.5 text-sm text-fg-soft">
              <span className="text-xs text-muted">{KIND_LABEL[t.kind]}</span>
              {titleOf(t)}
              <button type="button" aria-label="Entfernen" onClick={() => onPatch({ items: b.items.filter((x) => !(x.kind === t.kind && x.id === t.id)) })} className="rounded-full p-1 text-muted hover:text-red-500">
                <X className="h-3 w-3" strokeWidth={2.5} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {b.items.length < MAX_TILES && (
        <div className="flex flex-col gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Artikel, Ordner oder Karte suchen" aria-label="Suchen" className={field} />
          <ul className="flex flex-wrap gap-1.5">
            {matches.map((o) => (
              <li key={`${o.kind}:${o.id}`}>
                <button
                  type="button"
                  onClick={() => onPatch({ items: [...b.items, { kind: o.kind, id: o.id }] })}
                  className="rounded-full border border-dashed border-line px-3 py-1 text-sm text-fg-soft transition hover:border-accent hover:text-accent"
                >
                  <span className="mr-1.5 text-xs text-muted">{KIND_LABEL[o.kind]}</span>
                  {o.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Vorschau: grobe Darstellung der Startseite mit den eingegebenen Daten (Listen zeigen Platzhalterzeilen)
function Preview({ blocks, options }: { blocks: HomeBlock[]; options: TileOption[] }) {
  const shown = blocks.filter((b) => !b.hidden);
  if (shown.length === 0) return <p className="py-10 text-center text-sm text-muted">Noch nichts zu sehen</p>;
  const heading = "mb-2 font-serif text-lg text-fg";
  return (
    <div className="flex flex-col gap-5 text-sm">
      {shown.map((b) => {
        switch (b.type) {
          case "hero": {
            const h = { s: "min-h-16", m: "min-h-24", l: "min-h-36" }[b.size];
            return (
              <div key={b.id} className={`relative flex items-end overflow-hidden rounded-xl border border-line bg-surface-2 ${h}`}>
                {b.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
                )}
                <div className={`relative w-full p-3 ${b.image ? "bg-gradient-to-t from-black/70 to-transparent text-white" : "text-fg"} ${b.align === "center" ? "text-center" : ""}`}>
                  <p className="font-serif text-xl leading-tight">{b.title || "Name der Welt"}</p>
                  {b.subtitle && <p className="mt-1 text-xs opacity-85">{b.subtitle}</p>}
                </div>
              </div>
            );
          }
          case "text":
            return (
              <section key={b.id}>
                {b.title && <h3 className={heading}>{b.title}</h3>}
                {b.html ? <EmojiHtml className="post-content wiki-prose" html={b.html} /> : <p className="text-muted">Noch leer</p>}
              </section>
            );
          case "tiles": {
            const cols = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" }[b.columns];
            return (
              <section key={b.id}>
                {b.title && <h3 className={heading}>{b.title}</h3>}
                {b.items.length === 0 ? (
                  <p className="text-muted">Noch keine Einträge</p>
                ) : (
                  <ul className={`grid gap-2 ${cols}`}>
                    {b.items.map((t) => (
                      <li key={`${t.kind}:${t.id}`} className="truncate rounded-lg border border-line bg-surface px-2.5 py-3 text-fg-soft">
                        {options.find((o) => o.kind === t.kind && o.id === t.id)?.title ?? "Nicht mehr vorhanden"}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          }
          case "list":
            return (
              <section key={b.id}>
                <h3 className={heading}>{b.title || LIST_SOURCES.find((s) => s.id === b.source)?.label}</h3>
                <ul className="flex flex-col gap-1.5" aria-hidden>
                  {Array.from({ length: Math.min(b.count, 4) }).map((_, i) => (
                    <li key={i} className="h-7 rounded-lg bg-surface-2" />
                  ))}
                </ul>
              </section>
            );
          case "image":
            return b.image ? (
              <figure key={b.id} className={b.width === "narrow" ? "mx-auto max-w-[70%]" : ""}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.image} alt="" className="w-full rounded-xl border border-line object-cover" />
                {b.caption && <figcaption className="mt-1 text-xs text-muted">{b.caption}</figcaption>}
              </figure>
            ) : (
              <div key={b.id} className="rounded-xl border border-dashed border-line py-6 text-center text-muted">
                Noch kein Bild
              </div>
            );
          case "links":
            return (
              <section key={b.id}>
                {b.title && <h3 className={heading}>{b.title}</h3>}
                <ul className="flex flex-wrap gap-2">
                  {b.items
                    .filter((l) => l.label)
                    .map((l, i) => (
                      <li key={i} className="rounded-lg bg-accent-strong px-3 py-1.5 text-xs font-medium text-on-accent-strong">
                        {l.label}
                      </li>
                    ))}
                </ul>
              </section>
            );
          case "divider":
            return b.style === "line" ? <hr key={b.id} className="border-line" /> : <div key={b.id} aria-hidden className="h-6" />;
          case "search":
            return (
              <div key={b.id} className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-muted">
                <Search className="h-4 w-4" strokeWidth={2} />
                Im Wiki suchen
              </div>
            );
          case "shortcuts":
            return (
              <div key={b.id} className="flex flex-wrap gap-1.5">
                {["Karten", "Graph", "Beziehungen", "Zeitleiste", "Kalender", "Zufällig"].map((l) => (
                  <span key={l} className="rounded-full border border-line bg-surface px-3 py-1 text-xs text-fg-soft">
                    {l}
                  </span>
                ))}
              </div>
            );
        }
      })}
    </div>
  );
}
