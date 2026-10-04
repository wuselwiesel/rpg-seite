import { describe, expect, it } from "vitest";
import { PRESENCE_EMOJI_PRESETS, cleanPresenceEmoji, cleanPresenceText } from "./presence-emoji";

describe("cleanPresenceEmoji", () => {
  it("nimmt Emojis an, auch mit Variantenselektor und zusammengesetzte", () => {
    for (const e of PRESENCE_EMOJI_PRESETS) expect(cleanPresenceEmoji(e)).toBe(e);
    expect(cleanPresenceEmoji(" 👩‍💻 ")).toBe("👩‍💻");
    expect(cleanPresenceEmoji("🇮🇪")).toBe("🇮🇪");
  });
  it("lehnt Text, Gemischtes und Leeres ab", () => {
    for (const v of ["", "  ", "abc", "a🌙", "🌙x", "<b>", null, undefined, 5, "🌙".repeat(17)]) expect(cleanPresenceEmoji(v)).toBeNull();
  });
});

describe("cleanPresenceText", () => {
  it("kürzt, glättet Leerraum und gibt bei leer null", () => {
    expect(cleanPresenceText("  schreibt   gerade ")).toBe("schreibt gerade");
    expect(cleanPresenceText("x".repeat(80))?.length).toBe(40);
    expect(cleanPresenceText("   ")).toBeNull();
    expect(cleanPresenceText(undefined)).toBeNull();
  });
});
