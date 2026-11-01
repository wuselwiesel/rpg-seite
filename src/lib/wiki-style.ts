// Wiki-Design einer Welt (Spalte worlds.wiki_style, jsonb): gilt für alle Seiten des Wikis dieser Welt.
// Ohne Einstellung (null) sieht das Wiki aus wie bisher.

export const WIKI_ACCENTS = [
  { id: "plum", label: "Pflaume", light: "#7a4a92", dark: "#cfa5e0" },
  { id: "crimson", label: "Karmin", light: "#a02a3a", dark: "#f09aa5" },
  { id: "peach", label: "Bernstein", light: "#a8602a", dark: "#f0b98c" },
  { id: "gold", label: "Gold", light: "#8a6d0e", dark: "#e3c565" },
  { id: "sage", label: "Salbei", light: "#4d7a58", dark: "#9fd0a9" },
  { id: "teal", label: "Türkis", light: "#2f7a7a", dark: "#8fd0d0" },
  { id: "sky", label: "Himmelblau", light: "#2f6fa8", dark: "#8fbce8" },
  { id: "slate", label: "Schiefer", light: "#4a5078", dark: "#aeb4d6" },
] as const;

export const WIKI_FONTS = [
  { id: "classic", label: "Klassisch", css: "var(--font-serif)" },
  { id: "playfair", label: "Elegant", css: "var(--font-playfair)" },
  { id: "lora", label: "Buch", css: "var(--font-lora)" },
  { id: "cinzel", label: "Antik", css: "var(--font-cinzel)" },
  { id: "medieval", label: "Mittelalter", css: "var(--font-medieval-sharp)" },
  { id: "hand", label: "Handschrift", css: "var(--font-caveat)" },
  { id: "sans", label: "Schlicht", css: "var(--font-geist-sans)" },
] as const;

export const WIKI_CARDS = [
  { id: "soft", label: "Weich" },
  { id: "flat", label: "Flach" },
  { id: "line", label: "Nur Linien" },
] as const;
export const WIKI_RADII = [
  { id: "s", label: "Eckig" },
  { id: "m", label: "Normal" },
  { id: "l", label: "Rund" },
] as const;
export const WIKI_WIDTHS = [
  { id: "narrow", label: "Schmal" },
  { id: "normal", label: "Normal" },
  { id: "wide", label: "Breit" },
] as const;

export type WikiStyle = {
  accent: (typeof WIKI_ACCENTS)[number]["id"] | null;
  font: (typeof WIKI_FONTS)[number]["id"] | null;
  cards: (typeof WIKI_CARDS)[number]["id"];
  radius: (typeof WIKI_RADII)[number]["id"];
  width: (typeof WIKI_WIDTHS)[number]["id"];
  // Tönung der Karten in einer Akzentfarbe; null = keine
  tint: (typeof WIKI_ACCENTS)[number]["id"] | null;
};

export const DEFAULT_WIKI_STYLE: WikiStyle = { accent: null, font: null, cards: "soft", radius: "m", width: "normal", tint: null };

const pick = <T extends { id: string }>(list: readonly T[], v: unknown): T["id"] | null => (typeof v === "string" ? (list.find((o) => o.id === v)?.id ?? null) : null);

// Prüft einen Wert aus der Datenbank oder dem Formular; kein Objekt = kein eigenes Design (null)
export function parseWikiStyle(raw: unknown): WikiStyle | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  return {
    accent: pick(WIKI_ACCENTS, r.accent),
    font: pick(WIKI_FONTS, r.font),
    cards: pick(WIKI_CARDS, r.cards) ?? "soft",
    radius: pick(WIKI_RADII, r.radius) ?? "m",
    width: pick(WIKI_WIDTHS, r.width) ?? "normal",
    tint: pick(WIKI_ACCENTS, r.tint),
  };
}

export function isDefaultWikiStyle(s: WikiStyle): boolean {
  const d = DEFAULT_WIKI_STYLE;
  return s.accent === d.accent && s.font === d.font && s.cards === d.cards && s.radius === d.radius && s.width === d.width && s.tint === d.tint;
}

// CSS-Variablen und Merkmale für den Rahmen (die Regeln dazu stehen in globals.css unter .wiki-styled)
export function wikiStyleProps(style: WikiStyle | null): { style: Record<string, string>; data: Record<string, string> } {
  const vars: Record<string, string> = {};
  const data: Record<string, string> = {};
  if (!style) return { style: vars, data };
  const accent = WIKI_ACCENTS.find((a) => a.id === style.accent);
  if (accent) {
    vars["--wiki-accent-light"] = accent.light;
    vars["--wiki-accent-dark"] = accent.dark;
    data["data-wiki-accent"] = "1";
  }
  const font = WIKI_FONTS.find((f) => f.id === style.font);
  if (font) {
    vars["--wiki-font"] = font.css;
    data["data-wiki-font"] = "1";
  }
  const tint = WIKI_ACCENTS.find((a) => a.id === style.tint);
  if (tint) {
    vars["--wiki-tint-light"] = tint.light;
    vars["--wiki-tint-dark"] = tint.dark;
    data["data-wiki-tint"] = "1";
  }
  data["data-wiki-cards"] = style.cards;
  data["data-wiki-radius"] = style.radius;
  data["data-wiki-width"] = style.width;
  return { style: vars, data };
}
