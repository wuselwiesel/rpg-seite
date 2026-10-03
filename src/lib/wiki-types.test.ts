import { describe, expect, it } from "vitest";
import { WIKI_TYPES, WIKI_TYPE_IDS, mergeFields, newTypeId, outlineHtml, parseWikiType, usesPortraitImage, wikiTypeOf } from "./wiki-types";

describe("Wiki-Typen", () => {
  it("hat zu jeder Kennung genau einen Typ, passend zur Datenbank-Regel", () => {
    expect(WIKI_TYPES.map((t) => t.id).sort()).toEqual([...WIKI_TYPE_IDS].sort());
    for (const t of WIKI_TYPES) {
      expect(t.fields.length).toBeGreaterThan(0);
      expect(t.outline.length).toBeGreaterThan(0);
    }
  });

  it("liest nur gültige Typen aus dem Formular", () => {
    expect(parseWikiType("ort")).toBe("ort");
    expect(parseWikiType("quatsch")).toBeNull();
    expect(parseWikiType("")).toBeNull();
    expect(parseWikiType(null)).toBeNull();
    expect(wikiTypeOf(undefined)).toBeNull();
  });

  it("baut die Gliederung als Überschriften", () => {
    const html = outlineHtml(wikiTypeOf("ereignis")!);
    expect(html).toBe("<h2>Was geschah?</h2><p></p><h2>Vorgeschichte</h2><p></p><h2>Ablauf</h2><p></p><h2>Folgen</h2><p></p>");
  });

  it("ergänzt Steckbrief-Felder, ohne Eingaben zu verlieren oder doppelt anzulegen", () => {
    const type = wikiTypeOf("ereignis")!;
    const merged = mergeFields([{ icon: "", title: "Datum", text: "1. Mai" }, { icon: "", title: "", text: "" }], type);
    expect(merged.map((f) => f.title)).toEqual(["Datum", "Ort", "Beteiligte", "Folgen"]);
    expect(merged[0].text).toBe("1. Mai");
    expect(mergeFields([], type).length).toBe(4);
  });
});

describe("Bildform", () => {
  it("Personen bekommen ein Hochformat-Bild, alle anderen das breite Titelbild", () => {
    expect(usesPortraitImage("person")).toBe(true);
    expect(usesPortraitImage("ort")).toBe(false);
    expect(usesPortraitImage(null)).toBe(false);
    expect(usesPortraitImage(undefined)).toBe(false);
  });
});

describe("Eigene Arten", () => {
  const custom = [{ id: "zauber", label: "Zauber", plural: "Zauber", icon: "✨", color: "plum", hint: "", fields: ["Schule"], outline: ["Wirkung"], portrait: false }];

  it("findet und prüft Arten einer Welt statt des Grundstocks", () => {
    expect(wikiTypeOf("zauber", custom)?.label).toBe("Zauber");
    expect(wikiTypeOf("ort", custom)).toBeNull();
    expect(parseWikiType("zauber", custom)).toBe("zauber");
    expect(parseWikiType("ort", custom)).toBeNull();
  });

  it("macht aus dem Namen eine freie Kennung", () => {
    expect(newTypeId("Magie & Zauber", new Set())).toBe("magie_zauber");
    expect(newTypeId("Ärger", new Set())).toBe("aerger");
    expect(newTypeId("Ort", new Set(["ort"]))).toBe("ort_2");
    expect(newTypeId("???", new Set())).toBe("art");
  });
});
