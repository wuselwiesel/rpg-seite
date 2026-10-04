import { describe, expect, it } from "vitest";
import { applyRace, emptySheet, withDerived, type SheetData } from "./sheet-rules";
import { BULK_THRESHOLD, diffSheets, mergeWithRecent } from "./sheet-diff";

const base = (patch: Partial<SheetData> = {}): SheetData => withDerived({ ...emptySheet(), ...patch });
const with_ = (b: SheetData, patch: Partial<SheetData>): SheetData => withDerived({ ...b, ...patch });

describe("diffSheets", () => {
  it("neuer Bogen: eine Zeile „angelegt“", () => {
    expect(diffSheets(null, base())).toEqual([{ key: "created", label: "Charakterbogen", from: null, to: null }]);
  });
  it("keine Änderung, keine Einträge", () => {
    expect(diffSheets(base(), base())).toEqual([]);
  });
  it("Attribut: Gesamtwert alt → neu", () => {
    const a = base({ attrBasis: { MU: "13" } });
    const b = with_(a, { attrBasis: { MU: "11" } });
    expect(diffSheets(a, b)).toEqual([{ key: "attr:MU", label: "Mut", from: "13", to: "11" }]);
  });
  it("Attribut: Bonus ändern zählt in den Gesamtwert", () => {
    const a = base({ attrBasis: { KK: "10" } });
    const b = with_(a, { attrBonus: { KK: "3" } });
    expect(diffSheets(a, b)).toEqual([{ key: "attr:KK", label: "Körperkraft", from: "10", to: "13" }]);
  });
  it("Glück zeigt den Basiswert", () => {
    const a = base({ attrBasis: { GL: "5" } });
    const b = with_(a, { attrBasis: { GL: "10" } });
    expect(diffSheets(a, b)).toEqual([{ key: "attr:GL", label: "Glück", from: "5", to: "10" }]);
  });
  it("Natur wechseln: nur „Besondere Natur“, nicht jedes Attribut einzeln", () => {
    const a = base({ attrBasis: { MU: "10" } });
    const b = withDerived(applyRace(a, "werwolf"));
    const d = diffSheets(a, b);
    expect(d).toEqual([{ key: "race", label: "Besondere Natur", from: "Keine", to: "Werwolf" }]);
  });
  it("Talent-Bonus: Gesamtwert alt → neu; Attributänderung allein löst keinen Talent-Eintrag aus", () => {
    const a = base({ attrBasis: { GE: "14", KK: "12" } });
    const b = with_(a, { talentBonus: { talent_klettern: "2" } });
    expect(diffSheets(a, b)).toEqual([{ key: "talent:talent_klettern", label: "Klettern", from: "13", to: "15" }]);
    const c = with_(a, { attrBasis: { GE: "16", KK: "12" } });
    expect(diffSheets(a, c).map((x) => x.key)).toEqual(["attr:GE"]);
  });
  it("persönliche Infos und Familie mit Werten, Familie mit Zusatz im Namen", () => {
    const a = base();
    const b = with_(a, {
      personalFields: a.personalFields.map((f) => (f.label === "Rang" ? { ...f, value: "Anführer" } : f)),
      family: [{ label: "Mutter", value: "@Mira Salz" }],
    });
    const d = diffSheets(a, b);
    expect(d).toContainEqual({ key: "personal:Rang", label: "Rang", from: null, to: "Anführer" });
    expect(d).toContainEqual({ key: "family:Mutter", label: "Familie (Mutter)", from: null, to: "@Mira Salz" });
  });
  it("Notizen und Bild ohne Werte", () => {
    const a = base();
    const b = with_(a, { notesBlocks: [{ label: "Notizen", html: "<p>Hallo</p>" }], portraitUrl: "https://x/y.png" });
    expect(diffSheets(a, b).map((x) => x.key).sort()).toEqual(["notes", "portrait"]);
  });
  it("Formatierung allein ist keine Änderung der Notizen", () => {
    const a = base({ notesBlocks: [{ label: "Notizen", html: "<p>Hallo</p>" }] });
    const b = with_(a, { notesBlocks: [{ label: "Notizen", html: "<p><strong>Hallo</strong></p>" }] });
    expect(diffSheets(a, b)).toEqual([]);
  });
  it("sehr viele Änderungen werden zu einer Zeile", () => {
    const a = base();
    const basis: Record<string, string> = {};
    for (const c of ["MU", "IG", "GE", "KO", "IN", "KK", "FF", "CH", "SB", "GL"]) basis[c] = "5";
    const b = with_(a, { attrBasis: basis });
    expect(Object.keys(basis).length).toBeGreaterThan(BULK_THRESHOLD);
    expect(diffSheets(a, b)).toEqual([{ key: "bulk", label: "mehrere Felder", from: null, to: null }]);
  });
});

describe("mergeWithRecent", () => {
  const change = { key: "attr:MU", label: "Mut", from: "11", to: "12" };
  it("ohne frühere Zeile neu eintragen", () => expect(mergeWithRecent(null, change)).toEqual({ kind: "insert" }));
  it("Folgeänderung: neuer Endwert, alter Anfangswert bleibt", () => {
    expect(mergeWithRecent({ from: "13", to: "11" }, change)).toEqual({ kind: "update", to: "12" });
  });
  it("zurück auf den Anfangswert: Zeile entfällt", () => {
    expect(mergeWithRecent({ from: "13", to: "11" }, { ...change, to: "13" })).toEqual({ kind: "remove" });
  });
  it("Text wieder geleert: war er vorher leer, entfällt die Zeile", () => {
    expect(mergeWithRecent({ from: null, to: "ab" }, { key: "personal:Rang", label: "Rang", from: "ab", to: null })).toEqual({ kind: "remove" });
  });
  it("Felder ohne Werte bleiben eine Zeile", () => {
    expect(mergeWithRecent({ from: null, to: null }, { key: "notes", label: "Notizen", from: null, to: null })).toEqual({ kind: "update", to: null });
  });
});
