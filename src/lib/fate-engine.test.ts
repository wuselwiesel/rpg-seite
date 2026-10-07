import { describe, expect, it } from "vitest";
import { renderFateText, rollFate } from "@/lib/fate-engine";
import { FATES } from "@/lib/fate-data";
import type { CharacterMeta, Fate, SlotConfig } from "@/lib/fate-types";

function char(overrides: Partial<CharacterMeta> & { id: string; name: string }): CharacterMeta {
  return {
    gender: "weiblich",
    species: "mensch",
    ownerId: "owner-a",
    worldId: "world-1",
    partnerId: null,
    bestFriendId: null,
    ...overrides,
  };
}

describe("renderFateText", () => {
  const fate: Fate = {
    id: 9001,
    category: "Beziehung",
    severity: "leicht",
    minTargets: 0,
    maxTargets: 1,
    text: "{character1} tötet {character2}.",
    soloText: "{character1} tötet einen geliebten Menschen.",
  };

  it("nutzt den Platzhalter-Text, wenn ein Zielcharakter benannt ist", () => {
    const c1 = char({ id: "1", name: "Mara" });
    const c2 = char({ id: "2", name: "Jonas" });
    expect(renderFateText(fate, c1, [c2])).toBe("Mara tötet Jonas.");
  });

  it("nutzt den Solo-Text ohne Namen, wenn kein Ziel benannt ist", () => {
    const c1 = char({ id: "1", name: "Mara" });
    const result = renderFateText(fate, c1, []);
    expect(result).toBe("Mara tötet einen geliebten Menschen.");
    expect(result).not.toContain("Jonas");
  });

  it("fällt auf den Haupttext zurück, wenn kein Solo-Text definiert ist", () => {
    const noSolo: Fate = { ...fate, soloText: undefined };
    const c1 = char({ id: "1", name: "Mara" });
    expect(renderFateText(noSolo, c1, [])).toBe("Mara tötet {character2}.");
  });
});

describe("rollFate", () => {
  it("liefert einen Fehler, wenn kein Charakter zu Charakter-1-Filter passt", () => {
    const result = rollFate(
      [],
      [],
      { mode: "pool", gender: "alle", ownerId: "alle" },
      [],
      { min: "leicht", max: "extrem" },
    );
    expect("error" in result).toBe(true);
  });

  it("liefert einen Fehler, wenn der Schweregrad-Bereich keine Schicksale trifft", () => {
    const c1 = char({ id: "1", name: "Mara" });
    const result = rollFate(
      [c1],
      [],
      { mode: "pool", gender: "alle", ownerId: "alle" },
      [],
      // "leicht" bis "leicht", aber mit Kategorie-Filter, der garantiert nichts trifft
      { min: "leicht", max: "leicht" },
      ["Vampir"],
    );
    // Vampir-Schicksale erfordern char1.species === vampir, ein Mensch kann sie nicht würfeln.
    expect("error" in result).toBe(true);
  });

  it("respektiert den mode: specific und wählt nur den angegebenen Charakter", () => {
    const c1 = char({ id: "1", name: "Mara" });
    const other = char({ id: "2", name: "Lea" });
    const result = rollFate(
      [c1, other],
      [],
      { mode: "specific", characterId: "1" },
      [],
      { min: "leicht", max: "extrem" },
    );
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.char1.id).toBe("1");
    }
  });

  it("besetzt Zusatz-Charaktere nur aus dem passenden Slot (Welt/Geschlecht/Besitzer)", () => {
    const c1 = char({ id: "1", name: "Mara" });
    const wrongWorld = char({ id: "2", name: "Lea", worldId: "world-2" });
    const rightWorld = char({ id: "3", name: "Finn", worldId: "world-1", gender: "maennlich" });
    const targetSlots: SlotConfig[] = [{ worldId: "world-1", gender: "alle", ownerId: "alle" }];

    // Viele Versuche, damit die Zufallsauswahl nicht durch Glück einen falschen Fall übersieht.
    for (let i = 0; i < 25; i++) {
      const result = rollFate(
        [c1],
        [wrongWorld, rightWorld],
        { mode: "specific", characterId: "1" },
        targetSlots,
        { min: "leicht", max: "extrem" },
      );
      if ("error" in result) continue;
      for (const target of result.targets) {
        expect(target.worldId).toBe("world-1");
      }
    }
  });

  it("nie den Charakter selbst als Zusatz-Charakter besetzt", () => {
    const c1 = char({ id: "1", name: "Mara" });
    const targetSlots: SlotConfig[] = [
      { worldId: "world-1", gender: "alle", ownerId: "alle" },
      { worldId: "world-1", gender: "alle", ownerId: "alle" },
    ];
    for (let i = 0; i < 25; i++) {
      const result = rollFate([c1], [c1], { mode: "specific", characterId: "1" }, targetSlots, {
        min: "leicht",
        max: "extrem",
      });
      if ("error" in result) continue;
      expect(result.targets.every((t) => t.id !== result.char1.id)).toBe(true);
    }
  });
});

describe("FATES-Datenbank (Regressionsschutz)", () => {
  it("hat ausschließlich eindeutige IDs", () => {
    const ids = FATES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("hat für jedes optionale Schicksal (minTargets 0, maxTargets >= 1) einen Solo-Text ohne Zielplatzhalter", () => {
    const optional = FATES.filter((f) => f.minTargets === 0 && f.maxTargets >= 1);
    for (const fate of optional) {
      expect(fate.soloText, `Fate #${fate.id} braucht einen soloText`).toBeTruthy();
      expect(fate.soloText).not.toMatch(/\{character2\}|\{character3\}/);
    }
  });

  it("jeder Haupttext mit Zusatz-Charakteren referenziert auch alle erwarteten Platzhalter", () => {
    const withTargets = FATES.filter((f) => f.maxTargets >= 1);
    for (const fate of withTargets) {
      expect(fate.text, `Fate #${fate.id} braucht {character2}`).toContain("{character2}");
      if (fate.maxTargets >= 2) {
        expect(fate.text, `Fate #${fate.id} braucht {character3}`).toContain("{character3}");
      }
    }
  });

  it('Solo-Texte enthalten nie einen Namensplatzhalter für ein unbenanntes Ziel (Regression: "einen geliebten Menschen"-Bug)', () => {
    for (const fate of FATES) {
      if (!fate.soloText) continue;
      // {character1} ist char1 selbst und darf vorkommen - nur Platzhalter für unbenannte Ziele (ab character2) sind der Bug.
      expect(fate.soloText).not.toMatch(/\{character[2-9]\}/);
    }
  });
});

describe("eigene Schicksale", () => {
  it("werden gewürfelt und mit den Namen gefüllt", () => {
    // „Gefahr“ / „mittel“ gibt es eingebaut nicht, deshalb kann nur das eigene Schicksal gewählt werden
    expect(FATES.some((f) => f.category === "Gefahr" && f.severity === "mittel")).toBe(false);
    const custom: Fate = { id: "eigenes-1", category: "Gefahr", severity: "mittel", minTargets: 0, maxTargets: 0, text: "{character1} verliert den Schlüssel." };
    const result = rollFate([char({ id: "1", name: "Mara" })], [], { mode: "pool", gender: "alle", ownerId: "alle" }, [], { min: "mittel", max: "mittel" }, ["Gefahr"], [custom]);
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.fate.id).toBe("eigenes-1");
      expect(result.text).toBe("Mara verliert den Schlüssel.");
    }
  });
});
