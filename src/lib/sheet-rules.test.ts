import { describe, expect, it } from "vitest";
import { ATTR_TABLE, getStatOptions } from "./charakterbogen-stats";
import {
  applyRace,
  attrRows,
  budgets,
  emptySheet,
  hasErrors,
  luckAvailable,
  luckTotal,
  normalizeSheet,
  parseWhole,
  talentRows,
  validateSheet,
  withDerived,
  type SheetData,
} from "./sheet-rules";

function sheet(basis: Record<string, string>, bonus: Record<string, string> = {}, talentBonus: Record<string, string> = {}): SheetData {
  return { ...emptySheet(), attrBasis: basis, attrBonus: bonus, talentBonus };
}

describe("parseWhole", () => {
  it("leer ist null, Zahlen werden gelesen, Unsinn ist NaN", () => {
    expect(parseWhole("")).toBeNull();
    expect(parseWhole(" 12 ")).toBe(12);
    expect(parseWhole("-3")).toBe(-3);
    expect(parseWhole("1.5")).toBeNaN();
    expect(parseWhole("abc")).toBeNaN();
  });
});

describe("Attribute", () => {
  it("Gesamtwert = Basis + Bonus, Glück hat keinen", () => {
    const rows = attrRows(sheet({ MU: "10", GL: "12" }, { MU: "3", GL: "5" }));
    expect(rows.find((r) => r.code === "MU")?.total).toBe(13);
    expect(rows.find((r) => r.code === "GL")?.total).toBeNull();
    expect(rows.find((r) => r.code === "GL")?.bonus).toBeNull();
  });
  it("nur Bonus ohne Basis zählt ab 0", () => {
    expect(attrRows(sheet({}, { KK: "4" })).find((r) => r.code === "KK")?.total).toBe(4);
  });
  it("leer ohne Werte", () => {
    expect(attrRows(emptySheet()).every((r) => r.total === null)).toBe(true);
  });
});

describe("Talente", () => {
  it("Basis ist der gerundete Durchschnitt der beiden Attribute", () => {
    // Körperbeherrschung = GE + SB
    const t = talentRows(sheet({ GE: "10", SB: "5" })).find((x) => x.name === "Körperbeherrschung");
    expect(t?.basis).toBe(8); // 7,5 → 8
  });
  it("ohne beide Attribute keine Basis", () => {
    expect(talentRows(sheet({ GE: "10" })).find((x) => x.name === "Körperbeherrschung")?.basis).toBeNull();
  });
  it("Gesamtwert wird bei 19 gedeckelt", () => {
    const t = talentRows(sheet({ GE: "19", SB: "19" }, {}, { talent_koerperbeherrschung: "5" })).find((x) => x.name === "Körperbeherrschung");
    expect(t?.total).toBe(19);
    expect(t?.capped).toBe(true);
  });
  it("Zuordnung der Bonus-Schlüssel passt zu talentSlug", () => {
    const t = talentRows(emptySheet());
    expect(t).toHaveLength(22);
    expect(t[0].slug).toBe("talent_koerperbeherrschung");
  });
});

describe("Budgets und Prüfung", () => {
  it("zählt Attributpunkte (nur Basis) und Talentpunkte (nur Bonus)", () => {
    const b = budgets(sheet({ MU: "10", IG: "12" }, { MU: "9" }, { talent_singen: "4", talent_tanzen: "-2" }));
    expect(b.basisUsed).toBe(22);
    expect(b.basisRemaining).toBe(68);
    expect(b.talentUsed).toBe(2);
    expect(b.talentRemaining).toBe(18);
  });
  it("meldet zu hohe Budgets und Bereichsfehler", () => {
    const basis: Record<string, string> = {};
    for (const a of ATTR_TABLE) basis[a.code] = "10"; // 100 > 90
    const e = validateSheet(sheet(basis, { MU: "25" }, { talent_singen: "30" }));
    expect(e.budget.some((m) => m.includes("Attributpunkte"))).toBe(true);
    expect(e.attrBonus.MU).toBeTruthy();
    expect(e.talentBonus.talent_singen).toBeTruthy();
    expect(hasErrors(e)).toBe(true);
  });
  it("ein gültiger Bogen hat keine Fehler", () => {
    expect(hasErrors(validateSheet(sheet({ MU: "12", GL: "7" }, { MU: "2" }, { talent_singen: "3" })))).toBe(false);
  });
});

describe("Glückspunkte", () => {
  it("aus dem Glück-Basiswert, abzüglich verbrauchter", () => {
    const d = { ...sheet({ GL: "12" }), luckPointsUsed: 1 };
    expect(luckTotal(d)).toBe(3);
    expect(luckAvailable(d)).toBe(2);
  });
  it("ohne Glückswert keine Punkte", () => {
    expect(luckTotal(emptySheet())).toBe(0);
  });
});

describe("Besondere Natur", () => {
  it("Werwolf setzt die Boni, Wechsel zu Keine leert sie wieder", () => {
    const wolf = applyRace(emptySheet(), "werwolf");
    expect(wolf.attrBonus.KK).toBe("5");
    expect(wolf.attrBonus.SB).toBe("-5");
    const back = applyRace(wolf, "none");
    expect(back.attrBonus.KK).toBe("");
    expect(back.race).toBe("none");
  });
  it("Wechsel Werwolf → Vampir überschreibt die Werte beider", () => {
    const v = applyRace(applyRace(emptySheet(), "werwolf"), "vampir");
    expect(v.attrBonus.MU).toBe(""); // nur Werwolf
    expect(v.attrBonus.KO).toBe("5");
    expect(v.attrBonus.CH).toBe("5");
  });
  it("Vampir: Konstitution +5, kein Intelligenz-Bonus", () => {
    const v = applyRace(emptySheet(), "vampir");
    expect(v.attrBonus.KO).toBe("5");
    expect(v.attrBonus.IG ?? "").toBe("");
  });
  it("Boni anderer Attribute bleiben unberührt", () => {
    const d = { ...emptySheet(), attrBonus: { FF: "2" } };
    expect(applyRace(d, "vampir").attrBonus.FF).toBe("2");
  });
});

describe("normalizeSheet", () => {
  it("macht aus Unsinn einen leeren, gültigen Bogen", () => {
    const d = normalizeSheet("kaputt");
    expect(d.race).toBe("none");
    expect(d.personalFields.map((f) => f.label)).toContain("Vorname");
    expect(d.notesBlocks).toHaveLength(1);
  });
  it("verwirft ungültige Zahlen, Glück-Bonus und fremde Bild-Adressen", () => {
    const d = normalizeSheet({ attrBasis: { MU: "abc", IG: "12" }, attrBonus: { GL: "5", MU: "2000" }, portraitUrl: "javascript:alert(1)", race: "drache" });
    expect(d.attrBasis.MU).toBe("");
    expect(d.attrBasis.IG).toBe("12");
    expect(d.attrBonus.GL).toBe("");
    expect(d.attrBonus.MU).toBe("");
    expect(d.portraitUrl).toBeNull();
    expect(d.race).toBe("none");
  });
  it("Familie: Zeilen übernehmen, kürzen, begrenzen; fehlt sie, ist sie leer", () => {
    expect(normalizeSheet({}).family).toEqual([]);
    const d = normalizeSheet({ family: [{ label: "Mutter", value: "@Mira Salz" }, { label: "x".repeat(80), value: "y".repeat(300) }, "kaputt"] });
    expect(d.family[0]).toEqual({ label: "Mutter", value: "@Mira Salz" });
    expect(d.family[1].label).toHaveLength(40);
    expect(d.family[1].value).toHaveLength(200);
    expect(d.family[2]).toEqual({ label: "", value: "" });
    expect(normalizeSheet({ family: Array.from({ length: 50 }, () => ({ label: "a", value: "b" })) }).family).toHaveLength(30);
  });
  it("schneidet Längen ab und trägt die Talent-Basiswerte ein", () => {
    const d = normalizeSheet({ attrBasis: { GE: "10", SB: "6" }, personalFields: [{ label: "x".repeat(100), value: "y".repeat(500) }] });
    expect(d.personalFields[0].label).toHaveLength(40);
    expect(d.personalFields[0].value).toHaveLength(200);
    expect(d.talentBasis.talent_koerperbeherrschung).toBe("8");
  });
  it("übernimmt Daten des alten Bogens und bleibt für die Würfel-Auswahl lesbar", () => {
    const legacy = { attrBasis: { MU: "10", GL: "12" }, attrBonus: { MU: "3" }, talentBasis: { talent_singen: "99" }, talentBonus: { talent_singen: "2" }, race: "vampir" };
    const d = normalizeSheet(legacy);
    const mu = getStatOptions(d).find((o) => o.name === "Mut");
    expect(mu?.value).toBe(13);
    expect(withDerived(d).talentBasis.talent_singen).toBe(d.talentBasis.talent_singen);
  });
});
