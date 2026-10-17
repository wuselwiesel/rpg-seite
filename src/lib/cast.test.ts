import { describe, expect, it } from "vitest";
import { castLetter, castStatus, parseCastHtml, parseCastLine, suggestLinks } from "./cast";

describe("parseCastLine", () => {
  it("liest Name, Alter, Wesen, Beschreibung und Serie", () => {
    const r = parseCastLine("Bonnie Bennett (17) → Hexe (eine der mächtigsten Bennett-Hexen, Elenas beste Freundin) [TVD]");
    expect(r).toMatchObject({ name: "Bonnie Bennett", age_text: "17", species_text: "Hexe", source: "TVD", deceased: false, recognized: true });
    expect(r?.description).toBe("eine der mächtigsten Bennett-Hexen, Elenas beste Freundin");
  });
  it("erkennt † als verstorben und komplexe Alter", () => {
    const r = parseCastLine("† Boudicca / First Bennett Witch (ca. 30 / ü. 2000) → Hexe / Geist (die allererste Hexe) [TO]");
    expect(r).toMatchObject({ name: "Boudicca / First Bennett Witch", age_text: "ca. 30 / ü. 2000", species_text: "Hexe / Geist", deceased: true });
  });
  it("behält Klammern in der Beschreibung", () => {
    const r = parseCastLine("Ben (20 / ü. 3000) → Halbgott (Sohn von Vulcanus (dem Gott), lebt an der Schule) [Legacies]");
    expect(r?.description).toBe("Sohn von Vulcanus (dem Gott), lebt an der Schule");
    expect(r?.source).toBe("Legacies");
  });
  it("nimmt unbekannte Formate als Name mit", () => {
    const r = parseCastLine("Irgendwer ohne Pfeil");
    expect(r).toMatchObject({ name: "Irgendwer ohne Pfeil", recognized: false });
  });
  it("ignoriert Leeres", () => {
    expect(parseCastLine("  ")).toBeNull();
  });
});

describe("parseCastHtml", () => {
  it("liest alle Listenpunkte", () => {
    const html = "<ul><li><p>† Anna (20) → Vampir (kurz) [TVD]</p></li><li><p>Ben (30) → Mensch (lang) [TO]</p></li></ul>";
    const roles = parseCastHtml(html);
    expect(roles.map((r) => r.name)).toEqual(["Anna", "Ben"]);
    expect(roles[0].deceased).toBe(true);
  });
  it("entschlüsselt HTML-Zeichen", () => {
    expect(parseCastHtml("<li><p>Tom &amp; Jerry (1) → Mensch (x) [A]</p></li>")[0].name).toBe("Tom & Jerry");
  });
});

describe("castLetter", () => {
  it("nimmt den ersten Buchstaben ohne †, Anführungszeichen und Umlaute", () => {
    expect(castLetter("† Bonnie")).toBe("B");
    expect(castLetter("„Doc“ Brown")).toBe("D");
    expect(castLetter("Ärztin")).toBe("A");
    expect(castLetter("7th")).toBe("#");
  });
});

describe("castStatus", () => {
  const now = new Date("2026-10-17T12:00:00Z");
  const base = { state: "open" as const, holder_kind: null, holder_until: null };
  it("frei, NPC, vergeben", () => {
    expect(castStatus(base, null, now)).toBe("free");
    expect(castStatus({ ...base, state: "npc" }, null, now)).toBe("npc");
    expect(castStatus(base, { deleted: false, vacant: false }, now)).toBe("taken");
  });
  it("gelöschter oder freier Charakter macht die Rolle wieder frei", () => {
    expect(castStatus(base, { deleted: true, vacant: false }, now)).toBe("free");
    expect(castStatus(base, { deleted: false, vacant: true }, now)).toBe("free");
  });
  it("Reservierung mit Frist läuft ab, Zusage nicht", () => {
    expect(castStatus({ ...base, holder_kind: "reserved", holder_until: "2026-10-20T00:00:00Z" }, null, now)).toBe("reserved");
    expect(castStatus({ ...base, holder_kind: "reserved", holder_until: "2026-10-10T00:00:00Z" }, null, now)).toBe("free");
    expect(castStatus({ ...base, holder_kind: "approved" }, null, now)).toBe("reserved");
  });
});

describe("suggestLinks", () => {
  const roles = [
    { key: "1", name: "Damon Salvatore" },
    { key: "2", name: "Klaus Mikaelson" },
    { key: "3", name: "Elena Gilbert" },
    { key: "4", name: "Elena Marie Gilbert" },
  ];
  it("verbindet gleiche Namen und Namensanfänge, aber nur eindeutig", () => {
    const res = suggestLinks(roles, [
      { id: "a", name: "Damon" },
      { id: "b", name: "Klaus" },
      { id: "c", name: "Elena" },
    ]);
    expect(res).toContainEqual({ roleKey: "1", characterId: "a" });
    expect(res).toContainEqual({ roleKey: "2", characterId: "b" });
    expect(res.find((x) => x.characterId === "c")).toBeUndefined();
  });
});
