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
