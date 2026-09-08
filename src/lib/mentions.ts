export const MENTION_REGEX = /@\[([^\]]+)\]\(([0-9a-f-]{36})\)/g;

export function encodeMention(name: string, characterId: string) {
  return `@[${name}](${characterId})`;
}

export type MentionSegment =
  | { type: "text"; value: string }
  | { type: "mention"; name: string; characterId: string };

export function parseMentions(text: string): MentionSegment[] {
  const segments: MentionSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(MENTION_REGEX)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, index) });
    }
    segments.push({ type: "mention", name: match[1], characterId: match[2] });
    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }

  return segments;
}

// Für Rich-Text-Inhalte (Tiptap): extrahiert die Charakter-IDs aus
// <span data-type="mention" data-id="...">-Knoten im HTML.
export function parseMentionedCharacterIdsFromHtml(html: string): string[] {
  const ids = new Set<string>();
  for (const tagMatch of html.matchAll(/<span\b[^>]*>/g)) {
    const tag = tagMatch[0];
    if (!/data-type="mention"/.test(tag)) continue;
    const idMatch = /data-id="([0-9a-f-]{36})"/.exec(tag);
    if (idMatch) ids.add(idMatch[1]);
  }
  return Array.from(ids);
}
