// Besondere Naturen des Charakterbogens: die Standard-Naturen (Werwolf, Vampir) und die frei anpassbare Liste je Welt (worlds.nature_config).
// Jede Natur setzt feste Boni bei den Attributen. Eigenständig (ohne Import von sheet-rules), damit beide Dateien sie benutzen können.
export const NATURE_ATTR_CODES = ["MU", "IG", "GE", "KO", "IN", "KK", "FF", "CH", "SB"] as const;
export type NatureAttr = (typeof NATURE_ATTR_CODES)[number];

export type NatureDef = { id: string; name: string; bonuses: Partial<Record<NatureAttr, number>> };

export const DEFAULT_NATURES: NatureDef[] = [
  { id: "werwolf", name: "Werwolf", bonuses: { MU: 3, GE: 5, KO: 5, KK: 5, CH: 1, SB: -5 } },
  { id: "vampir", name: "Vampir", bonuses: { GE: 5, KO: 5, IN: 3, KK: 3, CH: 5, SB: -5 } },
];

export const MAX_NATURES = 12;
export const MAX_NATURE_NAME = 30;
export const NATURE_BONUS_MIN = -19;
export const NATURE_BONUS_MAX = 19;

// Neue Natur-Id: kurz, nur Kleinbuchstaben und Ziffern (steht im gespeicherten Bogen)
export function newNatureId(): string {
  return "n" + Math.random().toString(36).slice(2, 8);
}

const isAttr = (v: string): v is NatureAttr => (NATURE_ATTR_CODES as readonly string[]).includes(v);

// Macht aus beliebigen Daten (Datenbank, Formular) eine gültige Liste. Ein leeres Feld (null) gilt als Standard;
// eine bewusst leere Liste („keine besondere Natur in dieser Welt“) bleibt leer.
export function parseNatureConfig(raw: unknown): NatureDef[] {
  if (!Array.isArray(raw)) return DEFAULT_NATURES;
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const out: NatureDef[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const name = String(r.name ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_NATURE_NAME);
    if (!name || seenNames.has(name.toLowerCase())) continue;
    let id = typeof r.id === "string" && /^[a-z0-9]{2,12}$/.test(r.id) && r.id !== "none" ? r.id : "";
    if (!id || seenIds.has(id)) id = newNatureId();
    const bonuses: Partial<Record<NatureAttr, number>> = {};
    const src = r.bonuses && typeof r.bonuses === "object" ? (r.bonuses as Record<string, unknown>) : {};
    for (const [code, v] of Object.entries(src)) {
      const n = Number(v);
      if (isAttr(code) && Number.isInteger(n) && n !== 0 && n >= NATURE_BONUS_MIN && n <= NATURE_BONUS_MAX) bonuses[code] = n;
    }
    seenIds.add(id);
    seenNames.add(name.toLowerCase());
    out.push({ id, name, bonuses });
    if (out.length >= MAX_NATURES) break;
  }
  return out;
}

export function isDefaultNatures(list: NatureDef[]): boolean {
  return (
    list.length === DEFAULT_NATURES.length &&
    list.every((n, i) => {
      const d = DEFAULT_NATURES[i];
      const keys = new Set([...Object.keys(n.bonuses), ...Object.keys(d.bonuses)]);
      return n.id === d.id && n.name === d.name && [...keys].every((k) => (n.bonuses as Record<string, number>)[k] === (d.bonuses as Record<string, number>)[k]);
    })
  );
}
