import { describe, expect, it } from "vitest";
import { DEFAULT_TALENTS, isDefaultTalents, parseTalentConfig, talentSlug } from "./talents";

describe("parseTalentConfig", () => {
  it("fällt auf die Standardliste zurück", () => {
    expect(parseTalentConfig(null)).toBe(DEFAULT_TALENTS);
    expect(parseTalentConfig([])).toBe(DEFAULT_TALENTS);
    expect(parseTalentConfig([{ name: "", attrs: ["MU", "IG"] }])).toBe(DEFAULT_TALENTS);
  });
  it("übernimmt gültige Einträge, entfernt doppelte und kaputte", () => {
    const list = parseTalentConfig([
      { name: "Zaubern", attrs: ["IG", "MU"] },
      { name: "zaubern", attrs: ["IG", "KO"] },
      { name: "Kaputt", attrs: ["XX", "MU"] },
      { name: "Reiten", a: "GE", b: "MU" },
    ]);
    expect(list).toEqual([
      { name: "Zaubern", attrs: ["IG", "MU"] },
      { name: "Reiten", attrs: ["GE", "MU"] },
    ]);
  });
  it("Standard erkennen und Slugs stabil", () => {
    expect(isDefaultTalents(DEFAULT_TALENTS)).toBe(true);
    expect(isDefaultTalents(parseTalentConfig([{ name: "A", attrs: ["MU", "IG"] }]))).toBe(false);
    expect(talentSlug("Körperbeherrschung")).toBe("talent_koerperbeherrschung");
  });
});

import { normalizeSheet, talentRows, validateSheet, hasErrors } from "./sheet-rules";

describe("Talentliste je Welt im Bogen", () => {
  const defs = parseTalentConfig([
    { name: "Zaubern", attrs: ["IG", "MU"] },
    { name: "Reiten", attrs: ["GE", "MU"] },
  ]);
  it("Bögen nutzen die Liste der Welt", () => {
    const sheet = normalizeSheet(
      { attrBasis: { IG: "12", MU: "10", GE: "8" }, talentBonus: { talent_zaubern: "5", talent_klettern: "7" } },
      defs,
    );
    const rows = talentRows(sheet);
    expect(rows.map((r) => r.name)).toEqual(["Zaubern", "Reiten"]);
    expect(rows[0]).toMatchObject({ basis: 11, bonus: 5, total: 16 });
    // Talente, die es in dieser Welt nicht gibt, werden nicht übernommen
    expect(sheet.talentBonus.talent_klettern).toBeUndefined();
    expect(hasErrors(validateSheet(sheet))).toBe(false);
  });
  it("ohne Liste gilt der Standard", () => {
    expect(talentRows(normalizeSheet({})).length).toBe(DEFAULT_TALENTS.length);
  });
});
