import { describe, expect, it } from "vitest";
import { checkColor, cleanNameSymbol, DEFAULT_CHECK_COLOR, isCheckSymbol, makeCheck } from "./name-symbol";

describe("cleanNameSymbol", () => {
  it("lässt eigene Emojis (:name:) unverändert durch", () => {
    expect(cleanNameSymbol(" :katze_2: ")).toBe(":katze_2:");
  });

  it("nimmt von normalem Text nur das erste Zeichen", () => {
    expect(cleanNameSymbol("🌙 Mond")).toBe("🌙");
    expect(cleanNameSymbol("✦✧")).toBe("✦");
  });

  it("behält zusammengesetzte Emojis als ein Zeichen", () => {
    expect(cleanNameSymbol("👨‍👩‍👧 Familie")).toBe("👨‍👩‍👧");
    expect(cleanNameSymbol("🇩🇪x")).toBe("🇩🇪");
  });

  it("ungültige eigene Emojis und Leeres werden zu einem Zeichen bzw. leer", () => {
    expect(cleanNameSymbol("   ")).toBe("");
    expect(cleanNameSymbol(":a:")).toBe(":");
  });
  it("blauer Haken nur, wenn erlaubt", () => {
    expect(cleanNameSymbol("#haken", true)).toBe("#haken");
    expect(cleanNameSymbol(" #haken ", true)).toBe("#haken");
    expect(cleanNameSymbol("#haken")).toBe("");
    expect(cleanNameSymbol("#hakenx", true)).toBe("#");
  });
  it("Haken mit eigener Farbe", () => {
    expect(cleanNameSymbol("#haken:#FF00AA", true)).toBe("#haken:#ff00aa");
    expect(cleanNameSymbol("#haken:#0ea5e9", true)).toBe("#haken");
    expect(cleanNameSymbol("#haken:#ff00aa")).toBe("");
    expect(cleanNameSymbol("#haken:rot", true)).toBe("#");
    expect(cleanNameSymbol("#haken:#ff00aa;x", true)).toBe("#");
  });
  it("liest und baut Farben", () => {
    expect(isCheckSymbol("#haken")).toBe(true);
    expect(isCheckSymbol("#haken:#123456")).toBe(true);
    expect(isCheckSymbol("🌙")).toBe(false);
    expect(checkColor("#haken")).toBe(DEFAULT_CHECK_COLOR);
    expect(checkColor("#haken:#ABCDEF")).toBe("#abcdef");
    expect(makeCheck("nix")).toBe("#haken");
    expect(makeCheck("#22C55E")).toBe("#haken:#22c55e");
  });
});
