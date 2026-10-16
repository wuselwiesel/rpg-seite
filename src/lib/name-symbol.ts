// Das frei wählbare Zeichen neben dem Namen: ein Emoji/Symbol (ein Zeichen, auch zusammengesetzte wie Flaggen
// oder Familien) oder ein eigenes Emoji der Welt (:name:).
const CUSTOM_EMOJI_TOKEN = /^:[a-z0-9_]{2,32}:$/;

// Der blaue Haken: nur für Konten wählbar (nicht für Charaktere). Er sieht bewusst anders aus als das echte Siegel
// (rund statt gezackt, anderes Blau) und heißt „Blauer Haken“, nie „Verifiziert“.
export const BLUE_CHECK = "#haken";

export function cleanNameSymbol(raw: string, allowBlueCheck = false): string {
  const t = raw.trim();
  if (!t) return "";
  if (t === BLUE_CHECK) return allowBlueCheck ? BLUE_CHECK : "";
  if (CUSTOM_EMOJI_TOKEN.test(t)) return t;
  const first = new Intl.Segmenter("de", { granularity: "grapheme" }).segment(t)[Symbol.iterator]().next().value;
  return first ? first.segment : "";
}
