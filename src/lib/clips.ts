import { stripHtml } from "@/lib/strip-html";

// Ausschnitte aus Szenen („Wichtige Momente“): Kopie des Wortlauts, Sprunglink, Text für den Export und Zitate im Szenen-Chat.

export type ClipItem = { id: string; author: string; html: string; at: string };

export type Clip = {
  id: string;
  title: string;
  note: string | null;
  scene_title: string;
  story_post_id: string | null;
  items: ClipItem[];
  created_at: string;
};

// Zitat in einer Chat-Nachricht des Szenen-Chats (Kopie, damit es auch nach Änderungen lesbar bleibt)
export type ChatQuote = {
  storyPostId: string | null;
  entryIds: string[];
  clipId?: string;
  title?: string | null;
  items: { author: string; text: string }[];
};

const MAX_ITEM_TEXT = 220;

export function quoteSnippet(html: string, max = MAX_ITEM_TEXT): string {
  const text = stripHtml(html);
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

// Link zurück in die Szene: scrollt zur ersten Nachricht und hebt alle hervor (siehe ScrollToEntry)
export function clipJumpHref(storyPostId: string, entryIds: string[]): string {
  const ids = entryIds.filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  if (ids.length === 0) return `/story/${storyPostId}`;
  return `/story/${storyPostId}?hervor=${ids.join(",")}#beitrag-${ids[0]}`;
}

const dateFormat = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
const dayFormat = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Berlin" });

export function clipToText(clip: Clip): string {
  const lines = [clip.title];
  const meta = [clip.scene_title ? `Szene: ${clip.scene_title}` : null, `gespeichert am ${dayFormat.format(new Date(clip.created_at))}`].filter(Boolean);
  lines.push(meta.join(" · "));
  if (clip.note?.trim()) lines.push("", `Notiz: ${clip.note.trim()}`);
  for (const item of clip.items) {
    lines.push("", `${item.author}, ${dateFormat.format(new Date(item.at))}`, stripHtmlKeepBreaks(item.html));
  }
  return lines.join("\n");
}

export function collectionToText(name: string, characterName: string, clips: Clip[]): string {
  const head = `${name} (${characterName})`;
  const body = clips.map((c) => clipToText(c)).join("\n\n----------------------------------------\n\n");
  return clips.length ? `${head}\n${"=".repeat(head.length)}\n\n${body}\n` : `${head}\n${"=".repeat(head.length)}\n\nNoch keine Ausschnitte.\n`;
}

// Absätze und Zeilenumbrüche bleiben als Zeilen erhalten
function stripHtmlKeepBreaks(html: string): string {
  return html
    .replace(/<\/(p|h[1-6]|li|blockquote|div)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Vorschlag für den Titel: Textanfang der ersten Nachricht
export function defaultClipTitle(items: { html: string }[], sceneTitle: string): string {
  const first = items[0] ? quoteSnippet(items[0].html, 50) : "";
  return first || sceneTitle || "Ausschnitt";
}

// Chat-Zitat aus Ausschnitt-Einträgen bauen
export function quoteFromItems(storyPostId: string | null, items: ClipItem[], opts: { clipId?: string; title?: string | null } = {}): ChatQuote {
  return {
    storyPostId,
    entryIds: items.map((i) => i.id),
    clipId: opts.clipId,
    title: opts.title ?? null,
    items: items.slice(0, 6).map((i) => ({ author: i.author, text: quoteSnippet(i.html) })),
  };
}
