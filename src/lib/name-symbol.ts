// Das frei wählbare Zeichen neben dem Namen: ein Emoji/Symbol (ein Zeichen, auch zusammengesetzte wie Flaggen
// oder Familien) oder ein eigenes Emoji der Welt (:name:).
const CUSTOM_EMOJI_TOKEN = /^:[a-z0-9_]{2,32}:$/;

export function cleanNameSymbol(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (CUSTOM_EMOJI_TOKEN.test(t)) return t;
  const first = new Intl.Segmenter("de", { granularity: "grapheme" }).segment(t)[Symbol.iterator]().next().value;
  return first ? first.segment : "";
}
