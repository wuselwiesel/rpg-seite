import { describe, expect, it } from "vitest";
import { defaultHome, parseWikiHome, visibleBlocks } from "./wiki-home";

const U = "11111111-2222-4333-8444-555555555555";

describe("parseWikiHome", () => {
  it("liefert null ohne brauchbare Bausteine", () => {
    expect(parseWikiHome(null)).toBeNull();
    expect(parseWikiHome({ blocks: [] })).toBeNull();
    expect(parseWikiHome({ blocks: [{ type: "unbekannt" }] })).toBeNull();
  });
  it("behält Reihenfolge, schneidet Felder und prüft Kachel-IDs", () => {
    const h = parseWikiHome({
      blocks: [
        { id: "a", type: "tiles", title: "x".repeat(300), items: [{ kind: "page", id: U }, { kind: "page", id: U }, { kind: "page", id: "kaputt" }, { kind: "map", id: U }] },
        { id: "b", type: "list", source: "nope", count: 99 },
        { id: "c", type: "search", hidden: true },
      ],
    });
    expect(h?.blocks.map((b) => b.type)).toEqual(["tiles", "list", "search"]);
    const t = h?.blocks[0];
    expect(t?.type === "tiles" && t.title.length).toBe(120);
    expect(t?.type === "tiles" && t.items).toEqual([{ kind: "page", id: U }, { kind: "map", id: U }]);
    const l = h?.blocks[1];
    expect(l?.type === "list" && [l.source, l.count]).toEqual(["recent", 12]);
    expect(visibleBlocks(h).map((b) => b.id)).toEqual(["a", "b"]);
  });
  it("lehnt fremde Bild-Adressen ohne https ab und bereinigt Text", () => {
    const h = parseWikiHome({ blocks: [{ type: "hero", image: "javascript:alert(1)" }, { type: "text", html: "<b>x</b>" }] }, (s) => s.toUpperCase());
    expect(h?.blocks[0]).toMatchObject({ image: "" });
    expect(h?.blocks[1]).toMatchObject({ html: "<B>X</B>" });
  });
  it("Standardvorbelegung ist gültig", () => {
    expect(parseWikiHome(defaultHome())?.blocks).toHaveLength(4);
  });
});
