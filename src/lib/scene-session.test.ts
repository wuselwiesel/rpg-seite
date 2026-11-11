import { describe, expect, it } from "vitest";
import { averageStars, cleanSessionText, clampStars, durationLabel, normalizeStats, SESSION_TEXT_MAX } from "./scene-session";

describe("clampStars", () => {
  it("nimmt 1 bis 5", () => {
    expect([1, 2, 3, 4, 5].map(clampStars)).toEqual([1, 2, 3, 4, 5]);
  });
  it("lehnt alles andere ab", () => {
    expect([0, 6, 2.5, NaN, "x", null, undefined].map(clampStars)).toEqual([null, null, null, null, null, null, null]);
  });
  it("akzeptiert Zahlen als Text", () => {
    expect(clampStars("4")).toBe(4);
  });
});

describe("cleanSessionText", () => {
  it("trimmt und kürzt", () => {
    expect(cleanSessionText("  schön  ")).toBe("schön");
    expect(cleanSessionText("a".repeat(900))).toHaveLength(SESSION_TEXT_MAX);
  });
  it("macht Leeres und Fremdes zu null", () => {
    expect(cleanSessionText("   ")).toBeNull();
    expect(cleanSessionText(undefined)).toBeNull();
    expect(cleanSessionText(5)).toBeNull();
  });
});

describe("averageStars", () => {
  it("ist null ohne Bewertungen", () => {
    expect(averageStars([])).toBeNull();
  });
  it("mittelt", () => {
    expect(averageStars([{ stars: 5 }, { stars: 4 }])).toBe(4.5);
  });
});

describe("durationLabel", () => {
  it("formatiert Stunden und Minuten", () => {
    expect(durationLabel("2026-11-11T18:00:00Z", "2026-11-11T20:15:00Z")).toBe("2 Std. 15 Min.");
    expect(durationLabel("2026-11-11T18:00:00Z", "2026-11-11T19:00:00Z")).toBe("1 Std.");
    expect(durationLabel("2026-11-11T18:00:00Z", "2026-11-11T18:40:00Z")).toBe("40 Min.");
  });
  it("sagt „unter 1 Min.“ und „–“", () => {
    expect(durationLabel("2026-11-11T18:00:00Z", "2026-11-11T18:00:20Z")).toBe("unter 1 Min.");
    expect(durationLabel(null, null)).toBe("–");
  });
});

describe("normalizeStats", () => {
  it("füllt Fehlendes mit Null", () => {
    expect(normalizeStats(null)).toEqual({ messages: 0, words: 0, rolls: 0, first_at: null, last_at: null, characters: [] });
  });
  it("übernimmt gültige Werte und wirft leere Zeilen weg", () => {
    const s = normalizeStats({ messages: 7, words: 120, rolls: 1, first_at: "a", last_at: "b", characters: [{ id: "c1", name: "Mira", count: 4 }, { id: null, name: "Erzähler:in", count: 3 }, { id: "c2", name: "X", count: 0 }, 5] });
    expect(s.messages).toBe(7);
    expect(s.characters.map((c) => c.name)).toEqual(["Mira", "Erzähler:in"]);
  });
});
