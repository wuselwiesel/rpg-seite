import { describe, expect, it } from "vitest";
import { pageIconSymbol, parsePageIcon, symbolToPageIcon } from "./wiki-page-icon";

describe("Wiki-Seiten-Icon", () => {
  it("erkennt ein Symbol und liest seinen Namen", () => {
    expect(pageIconSymbol("symbol:castle")).toBe("castle");
    expect(pageIconSymbol(symbolToPageIcon("🔥"))).toBe("🔥");
  });

  it("ein Bild oder nichts ist kein Symbol", () => {
    expect(pageIconSymbol("https://x.test/a.png")).toBeNull();
    expect(pageIconSymbol("symbol:")).toBeNull();
    expect(pageIconSymbol(null)).toBeNull();
  });

  it("nimmt Bilder (http/https) und Symbole an, alles andere nicht", () => {
    expect(parsePageIcon("https://x.test/a.png")).toBe("https://x.test/a.png");
    expect(parsePageIcon(" symbol:castle ")).toBe("symbol:castle");
    expect(parsePageIcon("symbol:")).toBeNull();
    expect(parsePageIcon("symbol:<b>")).toBeNull();
    expect(parsePageIcon("javascript:alert(1)")).toBeNull();
    expect(parsePageIcon("")).toBeNull();
  });
});
