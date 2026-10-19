// Welches Wesen hat ein Charakter? Die Liste „Wesen“ der Welt (Auswahlliste mit `is_species`) hat Vorrang; ohne Einträge gilt die feste Natur.
// off: Die Welt hat „Wesen“ abgeschaltet, dann gibt es keine Angabe
type SpeciesList = { id: string; hasOptions: boolean; off?: boolean } | null;

export function speciesLabelOf(
  c: { choices?: Record<string, unknown> | null; species?: string | null },
  list: SpeciesList,
): string | null {
  if (list?.off) return null;
  if (list) {
    const v = c.choices?.[list.id];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (list.hasOptions) return null;
  }
  const s = (c.species ?? "").toLowerCase();
  if (s === "vampir") return "Vampir";
  if (s === "werwolf") return "Werwolf";
  if (s === "mensch") return "Mensch";
  return null;
}

// Die Wesen-Liste aus den Auswahllisten einer Welt
export function speciesListOf(lists: { id: string; isSpecies: boolean; mode: string; options: unknown[]; disabled?: boolean }[]): SpeciesList {
  const l = lists.find((x) => x.isSpecies);
  return l ? { id: l.id, hasOptions: l.mode === "dropdown" && l.options.length > 0, ...(l.disabled ? { off: true } : {}) } : null;
}
