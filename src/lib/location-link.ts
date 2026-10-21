// Zu einem bei einer Szene angegebenen Ort gibt es meist eine Wiki-Seite (wird beim Anlegen automatisch erstellt, siehe ensureLocationWikiPage).
// Gleiche Regel wie dort: Titel oder Alternativname, Groß- und Kleinschreibung egal.
export function findLocationPageId(pages: { id: string; title: string; aliases?: string[] }[], location: string | null | undefined): string | null {
  const wanted = location?.trim().toLowerCase();
  if (!wanted) return null;
  const hit = pages.find((p) => p.title.trim().toLowerCase() === wanted) ?? pages.find((p) => (p.aliases ?? []).some((a) => a.trim().toLowerCase() === wanted));
  return hit?.id ?? null;
}
