import { describe, expect, it } from "vitest";
import { getAppMode, isNeutralPath, parseRememberedMode } from "./app-mode";

describe("getAppMode", () => {
  it("Bereiche bestimmen den Modus", () => {
    expect(getAppMode("/")).toBe("ingame");
    expect(getAppMode("/search")).toBe("ingame");
    expect(getAppMode("/chats/abc")).toBe("ingame");
    expect(getAppMode("/story")).toBe("story");
    expect(getAppMode("/story/wuerfe")).toBe("story");
    expect(getAppMode("/ausschnitte/druck")).toBe("story");
    expect(getAppMode("/wiki/graph")).toBe("story");
    expect(getAppMode("/redaktion/verlauf")).toBe("redaktion");
    expect(getAppMode("/characters/relationships")).toBe("story");
    expect(getAppMode("/characters/abc/chabo")).toBe("story");
    expect(getAppMode("/hilfe")).toBe("story");
    expect(getAppMode(null)).toBe("ingame");
  });
  it("Charakterprofile übernehmen den gemerkten Modus (Profil in der Story bleibt in der Story)", () => {
    for (const p of ["/characters/abc", "/characters/abc/follows", "/characters/abc/edit", "/characters/abc/highlights/new"]) {
      expect(isNeutralPath(p)).toBe(true);
      expect(getAppMode(p, "story")).toBe("story");
      expect(getAppMode(p, "ingame")).toBe("ingame");
      expect(getAppMode(p)).toBe("ingame");
    }
  });
  it("die Charakterliste, neue Charaktere und das Beziehungsnetz sind nicht neutral", () => {
    for (const p of ["/characters", "/characters/new", "/characters/relationships", "/characters/abc/chabo", "/story", "/"]) expect(isNeutralPath(p)).toBe(false);
    expect(getAppMode("/characters", "story")).toBe("ingame");
    expect(getAppMode("/characters/new", "story")).toBe("ingame");
    expect(getAppMode("/characters/relationships", "ingame")).toBe("story");
    expect(isNeutralPath(null)).toBe(false);
  });
  it("Redaktion und Story ignorieren den gemerkten Modus", () => {
    expect(getAppMode("/redaktion", "story")).toBe("redaktion");
    expect(getAppMode("/story", "ingame")).toBe("story");
  });
});

describe("parseRememberedMode", () => {
  it("nur „story“ wird übernommen, alles andere ist Ingame", () => {
    expect(parseRememberedMode("story")).toBe("story");
    expect(parseRememberedMode("ingame")).toBe("ingame");
    expect(parseRememberedMode("redaktion")).toBe("ingame");
    expect(parseRememberedMode(undefined)).toBe("ingame");
    expect(parseRememberedMode(null)).toBe("ingame");
  });
});
