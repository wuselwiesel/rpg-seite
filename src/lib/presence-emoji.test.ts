import { describe, expect, it } from "vitest";
import { PRESENCE_EMOJI_PRESETS, cleanPresenceEmoji, cleanPresenceText } from "./presence-emoji";

describe("cleanPresenceEmoji", () => {
  it("nimmt Emojis an, auch mit Variantenselektor und zusammengesetzte", () => {
    for (const e of PRESENCE_EMOJI_PRESETS) expect(cleanPresenceEmoji(e)).toBe(e);
    expect(cleanPresenceEmoji(" 👩‍💻 ")).toBe("👩‍💻");
    expect(cleanPresenceEmoji("🇮🇪")).toBe("🇮🇪");
  });
  it("nimmt eigene Emojis der Welt (:name:) an", () => {
    expect(cleanPresenceEmoji(":kaffee_tasse:")).toBe(":kaffee_tasse:");
    expect(cleanPresenceEmoji(" :ok: ")).toBe(":ok:");
  });
  it("lehnt Text, Gemischtes und Leeres ab", () => {
    for (const v of ["", "  ", "abc", "a🌙", "🌙x", "<b>", null, undefined, 5, "🌙".repeat(21), ":a:", ":Gross:", ":mit leer:"]) expect(cleanPresenceEmoji(v)).toBeNull();
  });
});

describe("cleanPresenceText", () => {
  it("kürzt, glättet Leerraum und gibt bei leer null", () => {
    expect(cleanPresenceText("  schreibt   gerade ")).toBe("schreibt gerade");
    expect(cleanPresenceText("x".repeat(120))?.length).toBe(80);
    expect(cleanPresenceText("   ")).toBeNull();
    expect(cleanPresenceText(undefined)).toBeNull();
  });
});
