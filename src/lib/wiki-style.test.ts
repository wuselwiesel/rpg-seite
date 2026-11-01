import { describe, expect, it } from "vitest";
import { DEFAULT_WIKI_STYLE, isDefaultWikiStyle, parseWikiStyle, wikiStyleProps } from "./wiki-style";

describe("Wiki-Design", () => {
  it("prüft Werte und fällt bei Unbekanntem auf Standard zurück", () => {
    expect(parseWikiStyle(null)).toBeNull();
    expect(parseWikiStyle([])).toBeNull();
    expect(parseWikiStyle({ accent: "plum", font: "comic", cards: "x", radius: "l", width: 5, tint: "sage" })).toEqual({
      accent: "plum", font: null, cards: "soft", radius: "l", width: "normal", tint: "sage",
    });
  });

  it("erkennt das Standard-Design", () => {
    expect(isDefaultWikiStyle(DEFAULT_WIKI_STYLE)).toBe(true);
    expect(isDefaultWikiStyle({ ...DEFAULT_WIKI_STYLE, radius: "s" })).toBe(false);
  });

  it("liefert ohne Design nichts und mit Design Variablen und Merkmale", () => {
    expect(wikiStyleProps(null)).toEqual({ style: {}, data: {} });
    const p = wikiStyleProps({ ...DEFAULT_WIKI_STYLE, accent: "plum", font: "hand", tint: "sky", cards: "flat" });
    expect(p.style["--wiki-accent-light"]).toBe("#7a4a92");
    expect(p.style["--wiki-font"]).toBe("var(--font-caveat)");
    expect(p.data["data-wiki-cards"]).toBe("flat");
    expect(p.data["data-wiki-tint"]).toBe("1");
  });
});
