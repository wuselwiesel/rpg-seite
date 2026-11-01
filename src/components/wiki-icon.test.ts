import { describe, expect, it } from "vitest";
import { WIKI_ICON_GROUPS, WIKI_ICON_LIBRARY, isWikiIcon } from "./wiki-icon";

describe("Symbolbibliothek", () => {
  it("hat eindeutige Namen, Suchwörter und gültige Gruppen", () => {
    const names = WIKI_ICON_LIBRARY.map((i) => i.name);
    expect(new Set(names).size).toBe(names.length);
    for (const i of WIKI_ICON_LIBRARY) {
      expect(i.label.trim()).not.toBe("");
      expect(WIKI_ICON_GROUPS).toContain(i.group);
      expect(i.name).toMatch(/^[a-z0-9-]{1,40}$/);
    }
    expect(WIKI_ICON_LIBRARY.length).toBeGreaterThan(250);
  });

  it("kennt weiterhin alle bisher gespeicherten Symbole", () => {
    for (const old of ["map-pin", "paw-print", "users", "user", "calendar-days", "scroll-text", "gem", "file-text"]) expect(isWikiIcon(old)).toBe(true);
  });

  it("hält Emojis und eigene :emoji: für Nicht-Symbole", () => {
    expect(isWikiIcon("🔮")).toBe(false);
    expect(isWikiIcon(":drache:")).toBe(false);
    expect(isWikiIcon("")).toBe(false);
  });
});
