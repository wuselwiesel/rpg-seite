import type { CharakterbogenData } from "@/lib/charakterbogen";

export const ATTR_TABLE = [
  { code: "MU", name: "Mut" },
  { code: "IG", name: "Intelligenz" },
  { code: "GE", name: "Gewandtheit" },
  { code: "KO", name: "Konstitution" },
  { code: "IN", name: "Intuition" },
  { code: "KK", name: "Körperkraft" },
  { code: "FF", name: "Fingerfertigkeit" },
  { code: "CH", name: "Charisma" },
  { code: "SB", name: "Selbstbeherrschung" },
  { code: "GL", name: "Glück" },
];

export const TALENT_LIST = [
  "Körperbeherrschung", "Manipulation/Überzeugen", "Betören", "Beruhigen",
  "Menschenkenntnis", "Willensstärke", "Lügen", "Verbergen/Verheimlichen",
  "Singen", "Tanzen", "Reflexe", "Schwimmen", "Klettern", "Werfen", "Medizin",
  "Tierkunde", "Pflanzenkunde", "Mythologie", "Reparieren", "Empathie",
  "Sinnesschärfe", "Überleben",
];

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

export function num(v: string | undefined) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export type StatOption = { name: string; value: number; category: "Attribut" | "Talent" };

// Flache Liste aller würfelbaren Werte (Attribute + Talente) aus einem
// geladenen Charakterbogen, für die Wert-Auswahl beim Würfeln.
export function getStatOptions(data: CharakterbogenData): StatOption[] {
  return [
    ...ATTR_TABLE.map((a) => ({
      name: a.name,
      value: num(data.attrBasis?.[a.code]) + num(data.attrBonus?.[a.code]),
      category: "Attribut" as const,
    })),
    ...TALENT_LIST.map((name) => {
      const tid = talentSlug(name);
      return {
        name,
        value: num(data.talentBasis?.[tid]) + num(data.talentBonus?.[tid]),
        category: "Talent" as const,
      };
    }),
  ];
}
