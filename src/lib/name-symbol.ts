// Das frei wählbare Zeichen neben dem Namen: ein Emoji/Symbol (ein Zeichen, auch zusammengesetzte wie Flaggen
// oder Familien) oder ein eigenes Emoji der Welt (:name:).
const CUSTOM_EMOJI_TOKEN = /^:[a-z0-9_]{2,32}:$/;

// Der blaue Haken: nur für Konten wählbar (nicht für Charaktere). Er sieht bewusst anders aus als das echte Siegel
// (rund statt gezackt, anderes Blau) und heißt „Blauer Haken“, nie „Verifiziert“.
export const BLUE_CHECK = "#haken";
export const DEFAULT_CHECK_COLOR = "#0ea5e9";
// Gespeichert als „#haken“ (Standardblau) oder „#haken:#rrggbb“ (eigene Farbe)
const CHECK_TOKEN = /^#haken(?::(#[0-9a-fA-F]{6}))?$/;

export function isCheckSymbol(symbol: string | null | undefined): boolean {
  return Boolean(symbol && CHECK_TOKEN.test(symbol));
}

export function checkColor(symbol: string): string {
  return CHECK_TOKEN.exec(symbol)?.[1]?.toLowerCase() ?? DEFAULT_CHECK_COLOR;
}

export function makeCheck(color: string): string {
  const c = color.trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(c) && c !== DEFAULT_CHECK_COLOR ? `${BLUE_CHECK}:${c}` : BLUE_CHECK;
}

export function cleanNameSymbol(raw: string, allowBlueCheck = false): string {
  const t = raw.trim();
  if (!t) return "";
  if (CHECK_TOKEN.test(t)) return allowBlueCheck ? makeCheck(checkColor(t)) : "";
  if (CUSTOM_EMOJI_TOKEN.test(t)) return t;
  const first = new Intl.Segmenter("de", { granularity: "grapheme" }).segment(t)[Symbol.iterator]().next().value;
  return first ? first.segment : "";
}
