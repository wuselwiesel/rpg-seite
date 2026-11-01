// Inhaltsverzeichnis einer Wiki-Seite („Auf dieser Seite“). Pro Seite einstellbar (Spalte wiki_pages.toc, jsonb);
// ohne Einstellung gilt das bisherige Verhalten: automatisch, alle Überschriften, ab drei Überschriften.
import type { Heading } from "@/lib/wiki-html";

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
  // Überschriften (Text), die nicht erscheinen sollen
  hidden: string[];
};

export const DEFAULT_TOC: WikiToc = { mode: "auto", levels: 3, position: "side", numbered: false, title: "", hidden: [] };
export const TOC_TITLE = "Auf dieser Seite";
const MAX_HIDDEN = 60;

const key = (text: string) => text.replace(/\s+/g, " ").trim().toLowerCase();

// Prüft einen Wert aus der Datenbank oder dem Formular. Kein Objekt = keine eigene Einstellung (null).
export function parseToc(raw: unknown): WikiToc | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const hidden = Array.isArray(r.hidden)
    ? Array.from(new Set(r.hidden.filter((h): h is string => typeof h === "string").map((h) => h.replace(/\s+/g, " ").trim().slice(0, 200)).filter(Boolean))).slice(0, MAX_HIDDEN)
    : [];
  return {
    mode: r.mode === "off" ? "off" : "auto",
    levels: r.levels === 2 ? 2 : 3,
    position: r.position === "top" ? "top" : "side",
    numbered: r.numbered === true,
    title: typeof r.title === "string" ? r.title.replace(/\s+/g, " ").trim().slice(0, 40) : "",
    hidden,
  };
}

// Aus dem Formularfeld (JSON-Text) lesen
export function parseTocField(value: FormDataEntryValue | null): WikiToc | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    return parseToc(JSON.parse(value));
  } catch {
    return null;
  }
}

export function isDefaultToc(toc: WikiToc): boolean {
  const d = DEFAULT_TOC;
  return toc.mode === d.mode && toc.levels === d.levels && toc.position === d.position && toc.numbered === d.numbered && toc.title === d.title && toc.hidden.length === 0;
}

export type TocItem = { id: string; text: string; level: 2 | 3; number: string | null };

// Welche Einträge das Verzeichnis zeigt (leer = kein Verzeichnis). Ohne eigene Einstellung: alle ab drei Überschriften.
export function tocItems(headings: Heading[], toc: WikiToc | null): TocItem[] {
  if (!toc) {
    if (headings.length < 3) return [];
    return headings.map((h) => ({ ...h, number: null }));
  }
  if (toc.mode === "off") return [];
  const hidden = new Set(toc.hidden.map(key));
  const shown = headings.filter((h) => (toc.levels === 3 || h.level === 2) && !hidden.has(key(h.text)));
  let main = 0;
  let sub = 0;
  return shown.map((h) => {
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
    const text = m[2].replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
    if (text) out.push({ text, level: Number(m[1]) as 2 | 3 });
  }
  return out;
}

export function tocKey(text: string): string {
  return key(text);
}
