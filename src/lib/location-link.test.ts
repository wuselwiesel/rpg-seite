import { describe, expect, it } from "vitest";
import { findLocationPageId } from "./location-link";

const pages = [
  { id: "a", title: "Das Gutshaus Blackwood", aliases: ["Blackwood-Anwesen"] },
  { id: "b", title: "Schattenbibliothek" },
  { id: "c", title: "Gutshaus" },
];

describe("findLocationPageId", () => {
  it("findet die Seite über den Titel, Groß- und Kleinschreibung egal", () => {
    expect(findLocationPageId(pages, "schattenbibliothek")).toBe("b");
    expect(findLocationPageId(pages, "  Schattenbibliothek ")).toBe("b");
  });
  it("findet die Seite über einen Alternativnamen", () => {
    expect(findLocationPageId(pages, "blackwood-anwesen")).toBe("a");
  });
  it("der Titel hat Vorrang vor einem Alternativnamen", () => {
    expect(findLocationPageId([{ id: "x", title: "Hafen", aliases: ["Gutshaus"] }, ...pages], "Gutshaus")).toBe("c");
  });
  it("teilweise Übereinstimmung zählt nicht", () => {
    expect(findLocationPageId(pages, "Gutshaus Blackwood")).toBeNull();
  });
  it("ohne Ort oder ohne Seite gibt es keinen Link", () => {
    expect(findLocationPageId(pages, null)).toBeNull();
    expect(findLocationPageId(pages, "  ")).toBeNull();
    expect(findLocationPageId([], "Hafen")).toBeNull();
  });
});
