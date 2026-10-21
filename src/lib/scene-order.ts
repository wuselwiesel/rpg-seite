// Reihenfolge von Szenen: manuelle Reihenfolge (sort_order) zuerst, danach nach Anlegezeit (neueste zuerst)
export type OrderedScene = { id: string; sortOrder: number | null; createdAt: string };

export function compareScenes(a: OrderedScene, b: OrderedScene): number {
  if (a.sortOrder !== null && b.sortOrder !== null && a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  if (a.sortOrder !== null && b.sortOrder === null) return -1;
  if (a.sortOrder === null && b.sortOrder !== null) return 1;
  return b.createdAt.localeCompare(a.createdAt);
}

// Setzt eine Szene (id) vor eine andere (beforeId; null = ans Ende) in die Liste und liefert die neue Reihenfolge der IDs
export function placeScene(ids: string[], id: string, beforeId: string | null): string[] {
  const without = ids.filter((x) => x !== id);
  const at = beforeId ? without.indexOf(beforeId) : -1;
  if (at === -1) return [...without, id];
  return [...without.slice(0, at), id, ...without.slice(at)];
}

// Eine Szene um eine Stelle nach oben (-1) oder unten (1) schieben
export function shiftScene(ids: string[], id: string, dir: -1 | 1): string[] {
  const i = ids.indexOf(id);
  const j = i + dir;
  if (i === -1 || j < 0 || j >= ids.length) return ids;
  const copy = [...ids];
  [copy[i], copy[j]] = [copy[j], copy[i]];
  return copy;
}
