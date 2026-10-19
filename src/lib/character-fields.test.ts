import { describe, expect, it } from "vitest";
import { applyFieldChange, htmlToPlain, listCharacterFields, plainToHtml, type ProfileFields } from "./character-fields";
import { emptySheet } from "./sheet-rules";
import type { ChoiceList } from "./choice-lists";

const c: ProfileFields = { name: "Lyra", bio: "Hallo", house: null, quote: null, status_text: null, gender: "weiblich", choices: { l1: "Mensch" } };
const lists: ChoiceList[] = [
  { id: "l1", label: "Wesen", mode: "dropdown", isSpecies: true, options: [{ id: "o1", label: "Mensch" }, { id: "o2", label: "Vampir" }] },
  { id: "l2", label: "Beruf", mode: "text", isSpecies: false, options: [] },
];

describe("listCharacterFields", () => {
  it("nennt Profil, Listen und Bogenfelder; geheime Zeilen fehlen", () => {
    const sheet = emptySheet();
    sheet.personalFields = [{ label: "Alter", value: "20" }, { label: "Geheimnis", value: "x", secret: true }];
    sheet.notesBlocks = [{ label: "Notizen", html: "<p>A</p><p>B</p>" }];
    const keys = listCharacterFields(c, lists, sheet).map((f) => f.key);
    expect(keys).toContain("p:name");
    expect(keys).toContain("c:l1");
    expect(keys).toContain("s:personal:Alter");
    expect(keys).not.toContain("s:personal:Geheimnis");
    expect(keys).toContain("s:basis:MU");
    expect(keys.some((k) => k.startsWith("s:talent:"))).toBe(true);
    expect(listCharacterFields(c, lists, sheet).find((f) => f.key === "s:note:Notizen")?.value).toBe("A\n\nB");
  });
  it("ohne Bogen nur Profil und Listen", () => {
    expect(listCharacterFields(c, lists, null).every((f) => !f.key.startsWith("s:"))).toBe(true);
  });
});

describe("applyFieldChange", () => {
  it("Profilfelder", () => {
    expect(applyFieldChange("p:name", "  Mira ", c, lists, null)).toEqual({ ok: true, profile: { name: "Mira" } });
    expect(applyFieldChange("p:name", " ", c, lists, null).ok).toBe(false);
    expect(applyFieldChange("p:gender", "männlich", c, lists, null)).toEqual({ ok: true, profile: { gender: "maennlich" } });
    expect(applyFieldChange("p:gender", "", c, lists, null)).toEqual({ ok: true, profile: { gender: null } });
    expect(applyFieldChange("p:quote", "x".repeat(300), c, lists, null)).toMatchObject({ ok: true });
  });
  it("Auswahllisten prüfen den Eintrag", () => {
    expect(applyFieldChange("c:l1", "Vampir", c, lists, null)).toEqual({ ok: true, profile: { choices: { l1: "Vampir" } } });
    expect(applyFieldChange("c:l1", "Drache", c, lists, null).ok).toBe(false);
    expect(applyFieldChange("c:l2", "Bäcker", c, lists, null)).toEqual({ ok: true, profile: { choices: { l1: "Mensch", l2: "Bäcker" } } });
    expect(applyFieldChange("c:l1", "", c, lists, null)).toEqual({ ok: true, profile: { choices: {} } });
  });
  it("Bogenfelder ändern nur das Gewählte und lassen das Original unberührt", () => {
    const sheet = emptySheet();
    sheet.personalFields = [{ label: "Alter", value: "20" }];
    const r = applyFieldChange("s:personal:Alter", "25", c, lists, sheet);
    expect(r.ok && r.sheet?.personalFields[0].value).toBe("25");
    expect(sheet.personalFields[0].value).toBe("20");
    const b = applyFieldChange("s:basis:MU", "12", c, lists, sheet);
    expect(b.ok && b.sheet?.attrBasis.MU).toBe("12");
    expect(applyFieldChange("s:basis:MU", "40", c, lists, sheet).ok).toBe(false);
    expect(applyFieldChange("s:bonus:GL", "1", c, lists, sheet).ok).toBe(false);
    expect(applyFieldChange("s:personal:Fehlt", "1", c, lists, sheet).ok).toBe(false);
    expect(applyFieldChange("s:basis:MU", "1", c, lists, null).ok).toBe(false);
  });
  it("Notizen werden zu Absätzen", () => {
    const sheet = emptySheet();
    const r = applyFieldChange("s:note:Notizen", "Eins\n\nZwei <b>", c, lists, sheet);
    expect(r.ok && r.sheet?.notesBlocks[0].html).toBe("<p>Eins</p><p>Zwei &lt;b&gt;</p>");
    expect(htmlToPlain(plainToHtml("A\n\nB"))).toBe("A\n\nB");
  });
  it("unbekannte Schlüssel scheitern", () => {
    expect(applyFieldChange("x:y", "1", c, lists, null).ok).toBe(false);
    expect(applyFieldChange("p:nix", "1", c, lists, null).ok).toBe(false);
  });
});

describe("Haus / Zugehörigkeit abschalten", () => {
  const c = { name: "Lyra", bio: null, house: "Blackwood", quote: null, status_text: null, gender: null, choices: null };
  it("listet das Feld standardmäßig, ohne Haus nicht", () => {
    expect(listCharacterFields(c, [], null).some((f) => f.key === "p:house")).toBe(true);
    expect(listCharacterFields(c, [], null, { house: false }).some((f) => f.key === "p:house")).toBe(false);
    expect(listCharacterFields(c, [], null, { house: true }).some((f) => f.key === "p:house")).toBe(true);
  });
});

describe("Zitat und Status abschalten", () => {
  const c = { name: "Lyra", bio: null, house: null, quote: "Nie wieder", status_text: "unterwegs", gender: null, choices: null };
  it("lässt die Felder weg, wenn die Welt sie ausschaltet", () => {
    const keys = (o: { house?: boolean; quote?: boolean; status?: boolean }) => listCharacterFields(c, [], null, o).map((f) => f.key);
    expect(keys({})).toEqual(expect.arrayContaining(["p:quote", "p:status_text"]));
    expect(keys({ quote: false })).not.toContain("p:quote");
    expect(keys({ quote: false })).toContain("p:status_text");
    expect(keys({ status: false })).not.toContain("p:status_text");
    expect(keys({ quote: false, status: false, house: false })).toEqual(expect.arrayContaining(["p:name", "p:bio", "p:gender"]));
  });
});
