import { describe, expect, it } from "vitest";
import { matchWikiPages, wikiLinkText } from "./wiki-mention";

const pages = [
  { id: "1", title: "Vampire" },
  { id: "2", title: "Alte Vampirburg" },
  { id: "3", title: "Werwölfe" },
  { id: "4", title: "Vampir-Rat" },
];

describe("matchWikiPages", () => {
  it("zeigt bei leerer Eingabe die ersten Seiten alphabetisch", () => {
    expect(matchWikiPages(pages, "").map((p) => p.id)).toEqual(["2", "4", "1", "3"]);
  });
  it("stellt Titel, die mit der Eingabe beginnen, vor solche, die sie nur enthalten", () => {
    expect(matchWikiPages(pages, "vamp").map((p) => p.id)).toEqual(["4", "1", "2", ""]);
  });
  it("bietet bei unbekanntem Titel eine neue Seite an, bei bekanntem nicht", () => {
    expect(matchWikiPages(pages, "Hexen")).toEqual([{ id: "", title: "Hexen" }]);
    expect(matchWikiPages(pages, "vampire").some((p) => p.id === "")).toBe(false);
  });
  it("begrenzt die Treffer", () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ id: String(i), title: `Ort ${i}` }));
    expect(matchWikiPages(many, "ort").length).toBe(8);
  });
});

describe("matchWikiPages mit Figuren", () => {
  const items = [
    { id: "1", title: "Vampire", kind: "page" as const },
    { id: "c1", title: "Lucian", kind: "character" as const, avatarUrl: null },
  ];
  it("zeigt Seiten und Figuren gemeinsam", () => {
    expect(matchWikiPages(items, "").map((p) => p.id)).toEqual(["c1", "1"]);
    expect(matchWikiPages(items, "luc")[0]).toMatchObject({ id: "c1", kind: "character" });
  });
  it("bietet bei vorhandenem Figurennamen keine neue Seite an", () => {
    expect(matchWikiPages(items, "lucian").some((p) => p.id === "")).toBe(false);
  });
});

describe("wikiLinkText", () => {
  it("setzt den Titel in doppelte eckige Klammern und entfernt Störzeichen", () => {
    expect(wikiLinkText("Nebelhafen")).toBe("[[Nebelhafen]]");
    expect(wikiLinkText("A [B] | C")).toBe("[[A B  C]]");
  });
});
