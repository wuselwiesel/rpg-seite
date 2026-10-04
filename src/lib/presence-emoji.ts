// Eigener Online-Status: Emoji (statt des grünen Punkts) und optionaler kurzer Text.
export const PRESENCE_EMOJI_MAX = 16;
export const PRESENCE_TEXT_MAX = 40;
export const PRESENCE_EMOJI_PRESETS = ["🌙", "💤", "✍️", "📖", "🎲", "☕", "🎧", "🔥", "🌿", "✨", "🐺", "🦇"] as const;

const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}|\p{Emoji_Modifier}|\p{Regional_Indicator}|‍|️|[0-9#*]️?⃣)+$/u;

// Gültiges Emoji oder null (leer / kein Emoji / zu lang)
export function cleanPresenceEmoji(raw: unknown): string | null {
  const v = typeof raw === "string" ? raw.trim() : "";
  if (!v || v.length > PRESENCE_EMOJI_MAX || !EMOJI_ONLY.test(v)) return null;
  return v;
}

export function cleanPresenceText(raw: unknown): string | null {
  const v = typeof raw === "string" ? raw.replace(/\s+/g, " ").trim().slice(0, PRESENCE_TEXT_MAX) : "";
  return v || null;
}
