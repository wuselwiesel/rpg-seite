// Eigener Online-Status: Emoji (statt des grünen Punkts) und optionaler kurzer Text.
export const PRESENCE_EMOJI_MAX = 40;
export const PRESENCE_TEXT_MAX = 80;
export const PRESENCE_EMOJI_PRESETS = ["🌙", "💤", "✍️", "📖", "🎲", "☕", "🎧", "🔥", "🌿", "✨", "🐺", "🦇"] as const;

const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}|\p{Emoji_Modifier}|\p{Regional_Indicator}|‍|️|[0-9#*]️?⃣)+$/u;

// Ein eigenes Emoji der Welt (:name:), wie es der Emoji-Katalog im Texteditor einfügt
const CUSTOM_TOKEN = /^:[a-z0-9_]{2,32}:$/;

// Zeichen und Zierat aus der Symbol-Auswahl des Texteditors (✦ ★ ♥ → ⚔ …): nur Symbole/Satzzeichen, keine Buchstaben oder Ziffern
const SYMBOLS_ONLY = /^[\p{S}\p{P}\p{M}\s‍️]+$/u;

// Gültiges Statussymbol (Emoji, eigenes :name: oder Symbol) oder null (leer / Buchstaben / zu lang)
export function cleanPresenceEmoji(raw: unknown): string | null {
  const v = typeof raw === "string" ? raw.trim() : "";
  if (!v || v.length > PRESENCE_EMOJI_MAX) return null;
  if (CUSTOM_TOKEN.test(v)) return v;
  return EMOJI_ONLY.test(v) || SYMBOLS_ONLY.test(v) ? v : null;
}

export function cleanPresenceText(raw: unknown): string | null {
  const v = typeof raw === "string" ? raw.replace(/\s+/g, " ").trim().slice(0, PRESENCE_TEXT_MAX) : "";
  return v || null;
}
