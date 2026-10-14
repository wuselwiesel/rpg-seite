import { describe, expect, it } from "vitest";
import { DEFAULT_NATURES, isDefaultNatures, parseNatureConfig } from "./natures";
import { applyRace, emptySheet, normalizeSheet, raceOptions } from "./sheet-rules";

describe("parseNatureConfig", () => {
  it("ohne Eintrag gelten die Standard-Naturen, eine leere Liste bleibt leer", () => {
    expect(parseNatureConfig(null)).toEqual(DEFAULT_NATURES);
    expect(parseNatureConfig([])).toEqual([]);
  });
  it("säubert Namen, Boni und doppelte Einträge", () => {
    const list = parseNatureConfig([
      { id: "elf", name: "  Elf  ", bonuses: { GE: 4, IG: "2", GL: 5, MU: 0, KK: 99 } },
      { id: "elf", name: "elf", bonuses: {} },
      { name: "", bonuses: {} },
      { id: "none", name: "Keine", bonuses: { MU: 1 } },
    ]);
    expect(list.map((n) => n.name)).toEqual(["Elf", "Keine"]);
    expect(list[0]).toEqual({ id: "elf", name: "Elf", bonuses: { GE: 4, IG: 2 } });
    // „none“ ist als Id reserviert
    expect(list[1].id).not.toBe("none");
  });
  it("erkennt die Standardliste", () => {
    expect(isDefaultNatures(DEFAULT_NATURES.map((n) => ({ ...n, bonuses: { ...n.bonuses } })))).toBe(true);
    expect(isDefaultNatures([{ id: "werwolf", name: "Werwolf", bonuses: {} }])).toBe(false);
  });
});

describe("eigene Naturen im Bogen", () => {
  const natures = parseNatureConfig([
    { id: "elf", name: "Elf", bonuses: { GE: 4, CH: 2, KK: -3 } },
    { id: "ork", name: "Ork", bonuses: { KK: 6 } },
  ]);

  it("zeigt „Keine“ plus die Naturen der Welt", () => {
    expect(raceOptions(natures).map((r) => r.label)).toEqual(["Keine", "Elf", "Ork"]);
  });

  it("setzt die Boni beim Wechsel und nimmt die der alten Natur wieder weg", () => {
    const base = { ...emptySheet(), natureDefs: natures };
    const elf = applyRace(base, "elf");
    expect(elf.race).toBe("elf");
    expect(elf.attrBonus).toMatchObject({ GE: "4", CH: "2", KK: "-3" });
    const ork = applyRace(elf, "ork");
    expect(ork.attrBonus).toMatchObject({ GE: "", CH: "", KK: "6" });
    const none = applyRace(ork, "none");
    expect(none.race).toBe("none");
    expect(none.attrBonus.KK).toBe("");
  });

  it("eine Natur, die es in der Welt nicht gibt, gilt als „Keine“", () => {
    expect(applyRace({ ...emptySheet(), natureDefs: natures }, "vampir").race).toBe("none");
  });

  it("normalizeSheet behält bekannte Naturen und verwirft unbekannte", () => {
    expect(normalizeSheet({ race: "elf" }, undefined, natures).race).toBe("elf");
    expect(normalizeSheet({ race: "vampir" }, undefined, natures).race).toBe("none");
    // ohne die Liste der Welt gelten die Standard-Naturen
    expect(normalizeSheet({ race: "vampir" }).race).toBe("vampir");
    expect(normalizeSheet({ race: "elf" }).race).toBe("none");
  });
});
