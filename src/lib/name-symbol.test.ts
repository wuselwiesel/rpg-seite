import { describe, expect, it } from "vitest";
import { cleanNameSymbol } from "./name-symbol";

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
});
