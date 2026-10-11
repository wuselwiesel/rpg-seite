// Talente des Charakterbogens: Standardliste und die frei anpassbare Liste je Welt (worlds.talent_config).
// Eigenständig (ohne Import von sheet-rules), damit beide Dateien sie benutzen können.
export const ATTR_CODES = ["MU", "IG", "GE", "KO", "IN", "KK", "FF", "CH", "SB"] as const;
export type TalentAttr = (typeof ATTR_CODES)[number];
// Jedes Talent ist der gerundete Durchschnitt zweier Attribut-Gesamtwerte (Glück fließt in keins ein).
export type TalentDef = { name: string; attrs: [TalentAttr, TalentAttr] };

export const DEFAULT_TALENTS: TalentDef[] = [
  { name: "Körperbeherrschung", attrs: ["GE", "SB"] },
  { name: "Manipulation/Überzeugen", attrs: ["CH", "IG"] },
  { name: "Betören", attrs: ["CH", "IN"] },
  { name: "Küssen", attrs: ["CH", "GE"] },
  { name: "Beruhigen", attrs: ["CH", "SB"] },
  { name: "Menschenkenntnis", attrs: ["IN", "SB"] },
  { name: "Willensstärke", attrs: ["MU", "SB"] },
  { name: "Lügen", attrs: ["CH", "IG"] },
  { name: "Verbergen/Verheimlichen", attrs: ["GE", "IN"] },
  { name: "Singen", attrs: ["CH", "KO"] },
  { name: "Tanzen", attrs: ["GE", "KO"] },
  { name: "Reflexe", attrs: ["GE", "IN"] },
  { name: "Klettern", attrs: ["GE", "KK"] },
  { name: "Fahren", attrs: ["IN", "FF"] },
  { name: "Medizin", attrs: ["IG", "FF"] },
  { name: "Tierkunde", attrs: ["IN", "MU"] },
  { name: "Pflanzenkunde", attrs: ["IG", "IN"] },
  { name: "Mythologie", attrs: ["IG", "MU"] },
  { name: "Reparieren", attrs: ["FF", "IG"] },
  { name: "Empathie", attrs: ["IN", "CH"] },
  { name: "Sinnesschärfe", attrs: ["IN", "IG"] },
  { name: "Überleben", attrs: ["KO", "MU"] },
];

export const MAX_TALENTS = 40;
export const MAX_TALENT_NAME = 30;

// Schlüssel eines Talents im gespeicherten Bogen (talentBonus/talentBasis)
export function talentSlug(name: string) {
  return (
    "talent_" +
    name
      .toLowerCase()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
  );
}

const isAttr = (v: unknown): v is TalentAttr => typeof v === "string" && (ATTR_CODES as readonly string[]).includes(v);

// Macht aus beliebigen Daten (Datenbank, Formular) eine gültige Liste; ungültige Einträge entfallen,
// ist nichts Brauchbares übrig, gilt die Standardliste.
export function parseTalentConfig(raw: unknown): TalentDef[] {
  if (!Array.isArray(raw)) return DEFAULT_TALENTS;
  const seen = new Set<string>();
  const out: TalentDef[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const name = String(r.name ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_TALENT_NAME);
    const attrs = Array.isArray(r.attrs) ? r.attrs : [r.a, r.b];
    if (!name || !isAttr(attrs[0]) || !isAttr(attrs[1])) continue;
    const slug = talentSlug(name);
    if (slug === "talent_" || seen.has(slug)) continue;
    seen.add(slug);
    out.push({ name, attrs: [attrs[0], attrs[1]] });
    if (out.length >= MAX_TALENTS) break;
  }
  return out.length > 0 ? out : DEFAULT_TALENTS;
}

export function isDefaultTalents(list: TalentDef[]): boolean {
  return list.length === DEFAULT_TALENTS.length && list.every((t, i) => t.name === DEFAULT_TALENTS[i].name && t.attrs[0] === DEFAULT_TALENTS[i].attrs[0] && t.attrs[1] === DEFAULT_TALENTS[i].attrs[1]);
}
