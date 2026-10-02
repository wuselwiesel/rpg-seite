import { describe, expect, it } from "vitest";
import { hasTag, parseTags, tagCounts } from "./wiki-tags";

describe("parseTags", () => {
  it("trennt an Komma, entfernt # und Leerraum, ignoriert Doppelte und zu Kurzes", () => {
    expect(parseTags("#Magie,  magie, Alte  Zeit ;x, ,Vampire")).toEqual(["Magie", "Alte Zeit", "Vampire"]);
  });
  it("kürzt lange Tags und begrenzt die Zahl", () => {
    expect(parseTags("a".repeat(50))[0].length).toBe(30);
    expect(parseTags(Array.from({ length: 30 }, (_, i) => `tag${i}`).join(",")).length).toBe(12);
    expect(parseTags(null)).toEqual([]);
  });
});

describe("tagCounts / hasTag", () => {
  const pages = [{ tags: ["Magie", "Orte"] }, { tags: ["magie"] }, { tags: null }, {}];
  it("zählt ohne Rücksicht auf Groß-/Kleinschreibung, häufigste zuerst", () => {
    expect(tagCounts(pages)).toEqual([
      { tag: "Magie", count: 2 },
      { tag: "Orte", count: 1 },
    ]);
  });
  it("findet Tags unabhängig von der Schreibweise", () => {
    expect(hasTag(pages[0], " MAGIE ")).toBe(true);
    expect(hasTag(pages[2], "magie")).toBe(false);
  });
});
