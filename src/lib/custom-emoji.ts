export type EmojiMap = Record<string, string>;

export const EMOJI_NAME = /^[a-z0-9_]{2,32}$/;
const EMOJI_TOKEN = /:([a-z0-9_]{2,32}):/g;

function escapeAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

// Ersetzt :name: in HTML-Text (nicht in Tags) durch das Emoji-Bild. Unbekannte Namen bleiben stehen.
export function emojiHtml(html: string, map: EmojiMap): string {
  if (!html || Object.keys(map).length === 0 || !html.includes(":")) return html;
  return html
    .split(/(<[^>]*>)/)
    .map((part) => {
      if (part.startsWith("<")) return part;
      return part.replace(EMOJI_TOKEN, (whole, name: string) => {
        const url = map[name];
        if (!url) return whole;
        return `<img class="custom-emoji" src="${escapeAttr(url)}" alt=":${name}:" title=":${name}:" draggable="false">`;
      });
    })
    .join("");
}

export type EmojiPart = string | { name: string; url: string };

// Zerlegt Klartext in Text- und Emoji-Teile.
export function splitEmojiText(text: string, map: EmojiMap): EmojiPart[] {
  if (!text || Object.keys(map).length === 0 || !text.includes(":")) return [text];
  const parts: EmojiPart[] = [];
  let last = 0;
  for (const m of text.matchAll(EMOJI_TOKEN)) {
    const url = map[m[1]];
    if (!url) continue;
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push({ name: m[1], url });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : [text];
}
