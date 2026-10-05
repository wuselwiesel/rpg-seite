// @-Erwähnungen im Redaktions-Chat: „@benutzername“ (ohne Beachtung der Groß-/Kleinschreibung).
export const ACCOUNT_MENTION_REGEX = /@([\p{L}\p{N}_.-]+)/gu;

// Welche der Mitglieder werden im Text erwähnt? Gibt ihre Ids zurück (ohne Doppelte).
export function findMentionedMembers(text: string, members: { id: string; username: string }[]): string[] {
  const byName = new Map(members.map((m) => [m.username.toLowerCase(), m.id]));
  const found = new Set<string>();
  for (const match of text.matchAll(ACCOUNT_MENTION_REGEX)) {
    const id = byName.get(match[1].toLowerCase().replace(/[.-]+$/, ""));
    if (id) found.add(id);
  }
  return [...found];
}

// Text in Stücke teilen: normale Textteile und erkannte Erwähnungen (für die Hervorhebung).
export function splitMentions(text: string, usernames: Set<string>): { text: string; mention: boolean }[] {
  const out: { text: string; mention: boolean }[] = [];
  let last = 0;
  for (const match of text.matchAll(ACCOUNT_MENTION_REGEX)) {
    const name = match[1].replace(/[.-]+$/, "");
    if (!usernames.has(name.toLowerCase())) continue;
    const start = match.index ?? 0;
    const end = start + 1 + name.length;
    if (start > last) out.push({ text: text.slice(last, start), mention: false });
    out.push({ text: text.slice(start, end), mention: true });
    last = end;
  }
  if (last < text.length) out.push({ text: text.slice(last), mention: false });
  return out;
}
