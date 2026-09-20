export type StorySticker =
  | { id: string; type: "poll"; q: string; options: string[] }
  | { id: string; type: "question"; prompt: string }
  | { id: string; type: "countdown"; title: string; endsAt: string };

// Feste Position (Mitte, in % der Bühnenhöhe) je Sticker-Art, damit sich die Sticker nicht überdecken.
export const STICKER_TOP: Record<StorySticker["type"], number> = { countdown: 20, question: 42, poll: 68 };

// Prüft und säubert Sticker aus dem Formular (höchstens einer pro Art).
export function parseStickers(raw: string): StorySticker[] {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const out: StorySticker[] = [];
  const seen = new Set<string>();
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const s = item as Record<string, unknown>;
    const id = typeof s.id === "string" && /^[\w-]{1,40}$/.test(s.id) ? s.id : crypto.randomUUID();
    if (s.type === "poll" && !seen.has("poll")) {
      const q = String(s.q ?? "").trim().slice(0, 120);
      const options = (Array.isArray(s.options) ? s.options : []).map((o) => String(o).trim().slice(0, 40)).filter(Boolean).slice(0, 4);
      if (q && options.length >= 2) {
        seen.add("poll");
        out.push({ id, type: "poll", q, options });
      }
    } else if (s.type === "question" && !seen.has("question")) {
      const prompt = String(s.prompt ?? "").trim().slice(0, 120);
      if (prompt) {
        seen.add("question");
        out.push({ id, type: "question", prompt });
      }
    } else if (s.type === "countdown" && !seen.has("countdown")) {
      const title = String(s.title ?? "").trim().slice(0, 80);
      const endsAt = new Date(String(s.endsAt ?? ""));
      if (title && !Number.isNaN(endsAt.getTime())) {
        seen.add("countdown");
        out.push({ id, type: "countdown", title, endsAt: endsAt.toISOString() });
      }
    }
  }
  return out;
}

export function stickersOf(story: { stickers?: unknown }): StorySticker[] {
  return Array.isArray(story.stickers) ? (story.stickers as StorySticker[]) : [];
}

export type StickerState = {
  votes: Record<string, number[]>;
  myVotes: Record<string, number>;
  answers: Record<string, { name: string; text: string; mine: boolean }[]>;
};
