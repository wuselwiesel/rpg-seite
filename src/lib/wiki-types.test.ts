import { describe, expect, it } from "vitest";
import { WIKI_TYPES, WIKI_TYPE_IDS, mergeFields, outlineHtml, parseWikiType, wikiTypeOf } from "./wiki-types";

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
