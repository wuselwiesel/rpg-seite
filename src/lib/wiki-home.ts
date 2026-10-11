// Wiki-Startseite: Baukasten aus Bausteinen. Wird als jsonb in worlds.wiki_home gespeichert und beim Lesen und Speichern bereinigt.

export const MAX_BLOCKS = 30;
export const MAX_TILES = 24;
export const LIST_SOURCES = [
  { id: "recent", label: "Zuletzt bearbeitet" },
  { id: "newest", label: "Neu im Wiki" },
  { id: "favorites", label: "Favoriten" },
  { id: "drafts", label: "Meine Entwürfe" },
  { id: "scenes", label: "Aktuelle Szenen" },
  { id: "tags", label: "Tags" },
] as const;
export type ListSource = (typeof LIST_SOURCES)[number]["id"];
export type TileKind = "page" | "folder" | "map";
export type Tile = { kind: TileKind; id: string };

type Base = { id: string; hidden?: boolean };
export type HeroBlock = Base & { type: "hero"; title: string; subtitle: string; image: string };
export type TextBlock = Base & { type: "text"; title: string; html: string };
export type TilesBlock = Base & { type: "tiles"; title: string; items: Tile[] };
export type ListBlock = Base & { type: "list"; title: string; source: ListSource; count: number };
export type SearchBlock = Base & { type: "search" };
export type ShortcutsBlock = Base & { type: "shortcuts" };
export type HomeBlock = HeroBlock | TextBlock | TilesBlock | ListBlock | SearchBlock | ShortcutsBlock;
export type BlockType = HomeBlock["type"];
export type WikiHome = { blocks: HomeBlock[] };

export const BLOCK_TYPES: { type: BlockType; label: string }[] = [
  { type: "hero", label: "Titelbild" },
  { type: "text", label: "Text" },
  { type: "tiles", label: "Kacheln" },
  { type: "list", label: "Liste" },
  { type: "search", label: "Suche" },
  { type: "shortcuts", label: "Schnellzugriffe" },
];

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const newId = () => Math.random().toString(36).slice(2, 10);

export function newBlock(type: BlockType): HomeBlock {
  const id = newId();
  switch (type) {
    case "hero":
      return { id, type, title: "", subtitle: "", image: "" };
    case "text":
      return { id, type, title: "", html: "" };
    case "tiles":
      return { id, type, title: "", items: [] };
    case "list":
      return { id, type, title: "", source: "recent", count: 6 };
    case "search":
      return { id, type };
    case "shortcuts":
      return { id, type };
  }
}

// Vorbelegung, damit man beim ersten Einrichten nicht bei null anfängt
export function defaultHome(): WikiHome {
  return { blocks: [newBlock("hero"), newBlock("search"), newBlock("shortcuts"), newBlock("list")] };
}

// Macht aus beliebigen Daten eine gültige Startseite; null, wenn nichts Brauchbares darin steckt.
// `sanitizeHtml` bereinigt den Text der Text-Bausteine (serverseitig sanitizePostHtml).
export function parseWikiHome(raw: unknown, sanitizeHtml: (html: string) => string = (h) => h): WikiHome | null {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  if (!r || !Array.isArray(r.blocks)) return null;
  const seen = new Set<string>();
  const blocks: HomeBlock[] = [];
  for (const b of r.blocks) {
    if (!b || typeof b !== "object") continue;
    const o = b as Record<string, unknown>;
    let id = str(o.id, 24).replace(/[^a-z0-9_-]/gi, "");
    if (!id || seen.has(id)) id = newId();
    seen.add(id);
    const base = { id, ...(o.hidden === true ? { hidden: true } : {}) };
    switch (o.type) {
      case "hero": {
        const image = typeof o.image === "string" && /^https:\/\//.test(o.image) ? o.image.slice(0, 600) : "";
        blocks.push({ ...base, type: "hero", title: str(o.title, 120), subtitle: str(o.subtitle, 240), image });
        break;
      }
      case "text":
        blocks.push({ ...base, type: "text", title: str(o.title, 120), html: sanitizeHtml(typeof o.html === "string" ? o.html.slice(0, 20000) : "") });
        break;
      case "tiles": {
        const items: Tile[] = [];
        for (const t of Array.isArray(o.items) ? o.items : []) {
          const tr = t && typeof t === "object" ? (t as Record<string, unknown>) : {};
          if ((tr.kind === "page" || tr.kind === "folder" || tr.kind === "map") && typeof tr.id === "string" && uuid.test(tr.id)) {
            if (!items.some((x) => x.kind === tr.kind && x.id === tr.id)) items.push({ kind: tr.kind, id: tr.id });
          }
          if (items.length >= MAX_TILES) break;
        }
        blocks.push({ ...base, type: "tiles", title: str(o.title, 120), items });
        break;
      }
      case "list": {
        const source = LIST_SOURCES.find((s) => s.id === o.source)?.id ?? "recent";
        const n = Number(o.count);
        const count = Number.isFinite(n) ? Math.min(12, Math.max(3, Math.round(n))) : 6;
        blocks.push({ ...base, type: "list", title: str(o.title, 120), source, count });
        break;
      }
      case "search":
        blocks.push({ ...base, type: "search" });
        break;
      case "shortcuts":
        blocks.push({ ...base, type: "shortcuts" });
        break;
    }
    if (blocks.length >= MAX_BLOCKS) break;
  }
  return blocks.length > 0 ? { blocks } : null;
}

export function visibleBlocks(home: WikiHome | null): HomeBlock[] {
  return home ? home.blocks.filter((b) => !b.hidden) : [];
}
