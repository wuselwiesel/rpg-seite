"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Trash2, X } from "lucide-react";
import { AvatarUpload } from "@/components/avatar-upload";
import { RichTextEditor } from "@/components/rich-text-editor";
import { BLOCK_TYPES, LIST_SOURCES, MAX_BLOCKS, MAX_TILES, newBlock, type BlockType, type HomeBlock, type Tile, type WikiHome } from "@/lib/wiki-home";
import { saveWikiHome } from "../home-actions";

export type TileOption = { kind: Tile["kind"]; id: string; title: string };

const field = "rounded-lg border border-line bg-app px-3 py-2 text-sm text-fg outline-none focus:border-accent";
const KIND_LABEL: Record<Tile["kind"], string> = { page: "Artikel", folder: "Ordner", map: "Karte" };
const TYPE_LABEL = Object.fromEntries(BLOCK_TYPES.map((b) => [b.type, b.label])) as Record<BlockType, string>;
// Aktions-Symbole: mit Maus beim Darüberfahren, am Handy nach Antippen des Bausteins
const REVEAL =
  "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/blk:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100 [@media(hover:none)]:pointer-events-none [@media(hover:none)]:opacity-0 [@media(hover:none)]:group-data-[tapped]/blk:pointer-events-auto [@media(hover:none)]:group-data-[tapped]/blk:opacity-100";
const iconBtn = "rounded-full p-1.5 text-muted transition hover:bg-surface-2 hover:text-fg disabled:opacity-30";

export function HomeEditor({ worldId, initial, hasHome, options }: { worldId: string; initial: WikiHome; hasHome: boolean; options: TileOption[] }) {
  const router = useRouter();
  const [blocks, setBlocks] = useState<HomeBlock[]>(initial.blocks);
  const [tapped, setTapped] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const patch = (id: string, next: Partial<HomeBlock>) => setBlocks((cur) => cur.map((b) => (b.id === id ? ({ ...b, ...next } as HomeBlock) : b)));
  const move = (i: number, d: number) =>
    setBlocks((cur) => {
      const j = i + d;
      if (j < 0 || j >= cur.length) return cur;
      const next = [...cur];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  function submit(payload: WikiHome | null) {
    setError(null);
    start(async () => {
      const err = await saveWikiHome(worldId, JSON.stringify(payload));
      if (err) setError(err);
      else router.push("/wiki");
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-3xl text-fg">Startseite</h1>
        <div className="flex flex-wrap items-center gap-2">
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

      <ul className="flex flex-col gap-3">
        {blocks.map((b, i) => (
          <li
            key={b.id}
            data-tapped={tapped === b.id ? "" : undefined}
            onClick={(e) => {
              if (!window.matchMedia("(hover: none)").matches) return;
              if ((e.target as HTMLElement).closest("button, input, textarea, select, [contenteditable], a")) return;
              setTapped((v) => (v === b.id ? null : b.id));
            }}
            className={`group/blk flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 ${b.hidden ? "opacity-60" : ""}`}
          >
            <div className="flex items-center gap-2">
              <h2 className="min-w-0 flex-1 font-serif text-lg text-fg">
                {TYPE_LABEL[b.type]}
                {b.hidden && <span className="ml-2 text-xs font-sans text-muted">ausgeblendet</span>}
              </h2>
              <div className={`flex items-center gap-0.5 ${REVEAL}`}>
                <button type="button" aria-label="Nach oben" title="Nach oben" disabled={i === 0} onClick={() => move(i, -1)} className={iconBtn}>
                  <ArrowUp className="h-4 w-4" strokeWidth={2} />
                </button>
                <button type="button" aria-label="Nach unten" title="Nach unten" disabled={i === blocks.length - 1} onClick={() => move(i, 1)} className={iconBtn}>
                  <ArrowDown className="h-4 w-4" strokeWidth={2} />
                </button>
                <button type="button" aria-label={b.hidden ? "Einblenden" : "Ausblenden"} title={b.hidden ? "Einblenden" : "Ausblenden"} onClick={() => patch(b.id, { hidden: !b.hidden })} className={iconBtn}>
                  {b.hidden ? <Eye className="h-4 w-4" strokeWidth={2} /> : <EyeOff className="h-4 w-4" strokeWidth={2} />}
                </button>
                <button
                  type="button"
                  aria-label="Baustein löschen"
                  title="Löschen"
                  onClick={() => setBlocks((cur) => cur.filter((x) => x.id !== b.id))}
                  className={`${iconBtn} hover:text-red-500`}
                >
                  <Trash2 className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
            </div>
            <BlockFields block={b} options={options} onPatch={(p) => patch(b.id, p)} />
          </li>
        ))}
      </ul>

      {blocks.length < MAX_BLOCKS && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Baustein hinzufügen">
          {BLOCK_TYPES.map((t) => (
            <button
              key={t.type}
              type="button"
              onClick={() => setBlocks((cur) => [...cur, newBlock(t.type)])}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-line px-3 py-1.5 text-sm text-muted transition hover:border-accent hover:text-accent"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
              {t.label}
            </button>
          ))}
        </div>
      )}

      {hasHome && (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (window.confirm("Startseite entfernen? Danach erscheint wieder die automatische Übersicht.")) submit(null);
          }}
          className="w-fit text-sm text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
        >
          Startseite entfernen
        </button>
      )}
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
        <div className="flex flex-wrap gap-3">
          <input value={b.title} onChange={(e) => onPatch({ title: e.target.value })} maxLength={120} placeholder="Überschrift (leer = Name der Liste)" aria-label="Überschrift" className={`${field} min-w-[12rem] flex-1`} />
          <select value={b.source} onChange={(e) => onPatch({ source: e.target.value as typeof b.source })} aria-label="Inhalt" className={field}>
            {LIST_SOURCES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <select value={b.count} onChange={(e) => onPatch({ count: Number(e.target.value) })} aria-label="Anzahl" className={field}>
            {[3, 4, 6, 8, 10, 12].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      );
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
