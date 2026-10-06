// Tastenkürzel zum Wechseln des schreibenden Charakters: Schnellsuche und Weiterschalten.
// Reine Logik ohne Browser-Zugriff (testbar).

// Nächster (dir = 1) oder vorheriger (dir = -1) Eintrag in einer Liste, am Ende wieder von vorn.
export function cycleId(orderedIds: string[], currentId: string | undefined, dir: 1 | -1): string | null {
  if (orderedIds.length === 0) return null;
  const i = currentId ? orderedIds.indexOf(currentId) : -1;
  if (i === -1) return orderedIds[dir === 1 ? 0 : orderedIds.length - 1];
  return orderedIds[(i + dir + orderedIds.length) % orderedIds.length];
}

const fold = (s: string) => s.toLocaleLowerCase("de").normalize("NFD").replace(/\p{Diacritic}/gu, "");

// Schnellsuche: Treffer, wenn ein Wort des Namens mit dem Suchtext beginnt (ä = a, Groß/Klein egal) oder er im Namen vorkommt.
export function filterByName<T extends { name: string }>(items: T[], query: string): T[] {
  const q = fold(query.trim());
  if (!q) return items;
  const starts = items.filter((c) => fold(c.name).split(/\s+/).some((w) => w.startsWith(q)));
  const contains = items.filter((c) => !starts.includes(c) && fold(c.name).includes(q));
  return [...starts, ...contains];
}
