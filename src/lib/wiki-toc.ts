// Inhaltsverzeichnis einer Wiki-Seite („Auf dieser Seite“). Einstellbar pro Seite (Spalte wiki_pages.toc, jsonb), je Art (wiki_types.toc)
// und für die ganze Welt (worlds.wiki_toc_default). Es gilt die erste vorhandene Einstellung: Seite, Art, Welt; sonst das fest eingebaute
// Verhalten (automatisch, alle Überschriften, ab drei Überschriften).
import { decodeEntities, type Heading } from "@/lib/wiki-html";

// Eigener Eintrag, der auf eine andere Wiki-Seite zeigt
export type TocExtra = { id: string; label: string; pageId: string };

export type WikiToc = {
  // aus = kein Verzeichnis
  mode: "auto" | "off";
  // 2 = nur Hauptüberschriften, 3 = auch Unterüberschriften
  levels: 2 | 3;
  // seitlich (am Computer neben dem Text, am Handy als Aufklappfeld) oder als Feld über dem Text
  position: "side" | "top";
  numbered: boolean;
  // leer = „Auf dieser Seite“
  title: string;
  // Überschriften, die nicht erscheinen sollen (Schlüssel, siehe keyedHeadings)
  hidden: string[];
  // eigener Name im Verzeichnis statt des Überschriftentextes (Schlüssel der Überschrift → Name)
  labels: Record<string, string>;
  // gewünschte Reihenfolge: Schlüssel der Überschriften und „x:<id>“ der eigenen Einträge; was fehlt, steht danach in Textreihenfolge
  order: string[];
  // eigene Einträge mit Link auf andere Wiki-Seiten
  extra: TocExtra[];
  // erst ab so vielen Überschriften im Text zeigen (0 = immer)
  minHeadings: number;
};

export const DEFAULT_TOC: WikiToc = { mode: "auto", levels: 3, position: "side", numbered: false, title: "", hidden: [], labels: {}, order: [], extra: [], minHeadings: 0 };
export const TOC_TITLE = "Auf dieser Seite";
export const BUILT_IN_MIN_HEADINGS = 3;
const MAX_HIDDEN = 60;
const MAX_LABELS = 40;
const MAX_ORDER = 100;
const MAX_EXTRA = 20;
const MAX_KEY = 80;
// Obergrenze der gespeicherten Einstellung (Zeichen als JSON), passend zur Spalte
export const MAX_TOC_JSON = 15000;

const key = (text: string) => text.replace(/\s+/g, " ").trim().toLowerCase().slice(0, MAX_KEY);

// Jede Überschrift bekommt einen Schlüssel aus ihrem Text; die zweite mit gleichem Text „text#2“ usw. (so lässt sich auch eine von zwei gleichnamigen ausblenden).
export function keyedHeadings<T extends { text: string }>(headings: T[]): (T & { key: string })[] {
  const seen = new Map<string, number>();
  return headings.map((h) => {
    const base = key(h.text);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return { ...h, key: n === 1 ? base : `${base}#${n}` };
  });
}

const cleanLabel = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, 60) : "");

// Prüft einen Wert aus der Datenbank oder dem Formular. Kein Objekt = keine eigene Einstellung (null).
export function parseToc(raw: unknown): WikiToc | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const hidden = Array.isArray(r.hidden)
    ? Array.from(new Set(r.hidden.filter((h): h is string => typeof h === "string").map((h) => h.replace(/\s+/g, " ").trim().slice(0, 200)).filter(Boolean))).slice(0, MAX_HIDDEN)
    : [];
  const labels: Record<string, string> = {};
  if (r.labels && typeof r.labels === "object" && !Array.isArray(r.labels)) {
    for (const [k, v] of Object.entries(r.labels as Record<string, unknown>)) {
      const label = cleanLabel(v);
      const k2 = k.trim().slice(0, MAX_KEY + 4);
      if (k2 && label && Object.keys(labels).length < MAX_LABELS) labels[k2] = label;
    }
  }
  const order = Array.isArray(r.order)
    ? Array.from(new Set(r.order.filter((o): o is string => typeof o === "string").map((o) => o.trim().slice(0, MAX_KEY + 4)).filter(Boolean))).slice(0, MAX_ORDER)
    : [];
  const extra: TocExtra[] = [];
  if (Array.isArray(r.extra)) {
    for (const e of r.extra) {
      if (!e || typeof e !== "object") continue;
      const o = e as Record<string, unknown>;
      const id = typeof o.id === "string" ? o.id : "";
      const pageId = typeof o.pageId === "string" ? o.pageId : "";
      const label = cleanLabel(o.label);
      if (!/^[a-z0-9]{3,12}$/.test(id) || !/^[0-9a-f-]{36}$/i.test(pageId) || !label || extra.some((x) => x.id === id) || extra.length >= MAX_EXTRA) continue;
      extra.push({ id, label, pageId });
    }
  }
  const min = typeof r.minHeadings === "number" && Number.isFinite(r.minHeadings) ? Math.round(r.minHeadings) : 0;
  return {
    mode: r.mode === "off" ? "off" : "auto",
    levels: r.levels === 2 ? 2 : 3,
    position: r.position === "top" ? "top" : "side",
    numbered: r.numbered === true,
    title: typeof r.title === "string" ? r.title.replace(/\s+/g, " ").trim().slice(0, 40) : "",
    hidden,
    labels,
    order,
    extra,
    minHeadings: Math.min(10, Math.max(0, min)),
  };
}

// Aus dem Formularfeld (JSON-Text) lesen
export function parseTocField(value: FormDataEntryValue | null): WikiToc | null {
  if (typeof value !== "string" || !value.trim() || value.length > MAX_TOC_JSON) return null;
  try {
    return parseToc(JSON.parse(value));
  } catch {
    return null;
  }
}

// Erste vorhandene Einstellung: Seite, dann Art, dann Welt (null = fest eingebautes Verhalten)
export function resolveToc(...layers: unknown[]): WikiToc | null {
  for (const layer of layers) {
    const toc = parseToc(layer);
    if (toc) return toc;
  }
  return null;
}

export function isDefaultToc(toc: WikiToc): boolean {
  const d = DEFAULT_TOC;
  return (
    toc.mode === d.mode &&
    toc.levels === d.levels &&
    toc.position === d.position &&
    toc.numbered === d.numbered &&
    toc.title === d.title &&
    toc.hidden.length === 0 &&
    Object.keys(toc.labels).length === 0 &&
    toc.order.length === 0 &&
    toc.extra.length === 0 &&
    toc.minHeadings === d.minHeadings
  );
}

// Für Welt- und Art-Standard zählen nur die allgemeinen Einstellungen; Ausblenden, eigene Namen, Reihenfolge und eigene Einträge gehören zur einzelnen Seite.
export function tocDefaultsOnly(toc: WikiToc): WikiToc {
  return { ...DEFAULT_TOC, mode: toc.mode, levels: toc.levels, position: toc.position, numbered: toc.numbered, title: toc.title, minHeadings: toc.minHeadings };
}

export type TocItem = { id: string; key: string; text: string; level: 2 | 3; number: string | null; href?: string };

// Welche Einträge das Verzeichnis zeigt (leer = kein Verzeichnis). Ohne Einstellung: alle ab drei Überschriften.
export function tocItems(headings: Heading[], toc: WikiToc | null): TocItem[] {
  const keyed = keyedHeadings(headings);
  if (!toc) {
    if (keyed.length < BUILT_IN_MIN_HEADINGS) return [];
    return keyed.map((h) => ({ ...h, number: null }));
  }
  if (toc.mode === "off") return [];
  if (toc.minHeadings > 0 && keyed.length < toc.minHeadings) return [];
  const hidden = new Set(toc.hidden.map(key));
  let list: TocItem[] = keyed
    .filter((h) => (toc.levels === 3 || h.level === 2) && !hidden.has(h.key))
    .map((h) => ({ id: h.id, key: h.key, text: toc.labels[h.key]?.trim() || h.text, level: h.level, number: null }));
  for (const e of toc.extra) list.push({ id: `x-${e.id}`, key: `x:${e.id}`, text: e.label, level: 2, number: null, href: `/wiki/${e.pageId}` });
  if (toc.order.length > 0) {
    const pos = new Map(toc.order.map((k, i) => [k, i]));
    list = list
      .map((it, i) => ({ it, i }))
      .sort((a, b) => (pos.get(a.it.key) ?? 1e6 + a.i) - (pos.get(b.it.key) ?? 1e6 + b.i))
      .map((x) => x.it);
  }
  let main = 0;
  let sub = 0;
  return list.map((h) => {
    if (h.level === 2) {
      main += 1;
      sub = 0;
    } else {
      sub += 1;
    }
    return { ...h, number: toc.numbered ? (h.level === 2 ? `${main}.` : `${Math.max(main, 1)}.${sub}`) : null };
  });
}

// Überschriften (Ebene 2 und 3) aus dem HTML des Editors, in der Reihenfolge des Textes; für die Liste im Formular.
export function headingsOfHtml(html: string): { text: string; level: 2 | 3 }[] {
  const out: { text: string; level: 2 | 3 }[] = [];
  for (const m of html.matchAll(/<h([23])[^>]*>([\s\S]*?)<\/h\1>/g)) {
    const text = decodeEntities(m[2].replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();
    if (text) out.push({ text, level: Number(m[1]) as 2 | 3 });
  }
  return out;
}

export function tocKey(text: string): string {
  return key(text);
}
