export type WikiMentionItem = { id: string; title: string };

// Passende Seiten für die Eingabe nach dem @: Titel, die mit der Eingabe beginnen, vor Titeln, die sie nur enthalten.
// Ist die Eingabe kein vorhandener Titel, kommt als letzter Eintrag „neue Seite“ (id leer) dazu.
export function matchWikiPages(pages: WikiMentionItem[], query: string, limit = 8): WikiMentionItem[] {
  const q = query.trim().toLowerCase();
  const sorted = [...pages].sort((a, b) => a.title.localeCompare(b.title, "de"));
  const starts = sorted.filter((p) => p.title.toLowerCase().startsWith(q));
  const contains = sorted.filter((p) => !p.title.toLowerCase().startsWith(q) && p.title.toLowerCase().includes(q));
  const all = [...starts, ...contains];
  const offerNew = Boolean(q) && !pages.some((p) => p.title.toLowerCase() === q);
  const hits = all.slice(0, offerNew ? limit - 1 : limit);
  if (offerNew) hits.push({ id: "", title: query.trim() });
  return hits;
}

// Text, der beim Auswählen eingefügt wird: [[Titel]]. Klammern und Striche im Titel würden den Link zerreißen.
export function wikiLinkText(title: string): string {
  return `[[${title.replace(/[[\]|]/g, "").trim()}]]`;
}
