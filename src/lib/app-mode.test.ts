import { describe, expect, it } from "vitest";
import { getAppMode, isNeutralPath, parseRememberedMode } from "./app-mode";

describe("getAppMode", () => {
  it("Bereiche bestimmen den Modus", () => {
    expect(getAppMode("/")).toBe("ingame");
    expect(getAppMode("/search")).toBe("ingame");
    expect(getAppMode("/chats/abc")).toBe("ingame");
    expect(getAppMode("/story")).toBe("story");
    expect(getAppMode("/story/abc")).toBe("story");
    expect(getAppMode("/story/new")).toBe("story");
    expect(getAppMode("/ausschnitte/druck")).toBe("story");
    expect(getAppMode("/redaktion/verlauf")).toBe("redaktion");
    expect(getAppMode("/hilfe")).toBe("story");
    expect(getAppMode(null)).toBe("ingame");
  });
  it("Charakterprofile samt ChaBo übernehmen den gemerkten Modus (Profil in der Story bleibt in der Story)", () => {
    for (const p of ["/characters/abc", "/characters/abc/follows", "/characters/abc/edit", "/characters/abc/highlights/new", "/characters/abc/chabo"]) {
      expect(isNeutralPath(p)).toBe(true);
      expect(getAppMode(p, "story")).toBe("story");
      expect(getAppMode(p, "ingame")).toBe("ingame");
      expect(getAppMode(p)).toBe("ingame");
    }
  });
  it("Welt-Seite und alles dahinter übernehmen den gemerkten Modus", () => {
    for (const p of ["/welt", "/wiki", "/wiki/graph", "/characters/relationships", "/story/wuerfe", "/story/charaktere"]) {
      expect(isNeutralPath(p)).toBe(true);
      expect(getAppMode(p, "story")).toBe("story");
      expect(getAppMode(p, "ingame")).toBe("ingame");
    }
  });
  it("die Charakterliste und neue Charaktere sind nicht neutral", () => {
    for (const p of ["/characters", "/characters/new", "/story", "/story/abc", "/", "/wikipedia"]) expect(isNeutralPath(p)).toBe(false);
    expect(getAppMode("/characters", "story")).toBe("ingame");
    expect(getAppMode("/characters/new", "story")).toBe("ingame");
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
