import { describe, expect, it } from "vitest";
import { activeLists, choiceEntries, isListActive, isSpeciesOff, limitError, parseChoices, speciesFromLabel, splitOptionLabels, type ChoiceList } from "./choice-lists";

const species: ChoiceList = { id: "s", label: "Wesen", mode: "dropdown", isSpecies: true, options: [{ id: "1", label: "Elf" }, { id: "2", label: "Werwolf" }] };
const job: ChoiceList = { id: "j", label: "Beruf", mode: "text", isSpecies: false, options: [] };
const empty: ChoiceList = { id: "e", label: "Haus", mode: "dropdown", isSpecies: false, options: [] };

describe("choice-lists", () => {
  it("leere Dropdown-Listen sind inaktiv", () => {
    expect(isListActive(empty)).toBe(false);
    expect(activeLists([species, job, empty]).map((l) => l.id)).toEqual(["s", "j"]);
  });
  it("Dropdown-Werte müssen in der Liste stehen, Text wird gekürzt", () => {
    const form: Record<string, string> = { choice_s: "Elf", choice_j: "  Laternen-  anzünder ", choice_e: "x" };
    expect(parseChoices((k) => form[k] ?? null, [species, job, empty])).toEqual({ s: "Elf", j: "Laternen- anzünder" });
    expect(parseChoices(() => "Kobold", [species])).toEqual({});
  });
  it("Natur aus Wesen", () => {
    expect(speciesFromLabel("Werwolf")).toBe("werwolf");
    expect(speciesFromLabel("Elf")).toBe("mensch");
    expect(speciesFromLabel(null)).toBe("mensch");
  });
  it("Anzeige in Listenreihenfolge", () => {
    expect(choiceEntries({ j: "Bäcker", s: "Elf", x: "?" }, [species, job])).toEqual([
      { label: "Wesen", value: "Elf" },
      { label: "Beruf", value: "Bäcker" },
    ]);
  });
  it("Einträge trennen", () => {
    expect(splitOptionLabels("Elf, Zwerg\nelf; Troll")).toEqual(["Elf", "Zwerg", "Troll"]);
  });
});

describe("limitError", () => {
  const lists = [
    {
      id: "l1",
      label: "Wesen",
      mode: "dropdown" as const,
      isSpecies: true,
      options: [
        { id: "o1", label: "Vampir", maxCount: 2 },
        { id: "o2", label: "Mensch", maxCount: null },
      ],
    },
  ];
  it("lässt Einträge ohne Grenze und unterhalb der Grenze zu", () => {
    expect(limitError(lists, { l1: "Mensch" }, { l1: { Mensch: 50 } })).toBeNull();
    expect(limitError(lists, { l1: "Vampir" }, { l1: { Vampir: 1 } })).toBeNull();
  });
  it("sperrt, wenn die Höchstzahl erreicht ist", () => {
    expect(limitError(lists, { l1: "Vampir" }, { l1: { Vampir: 2 } })).toContain("schon 2×");
  });
  it("wer den Eintrag schon hat, bleibt ungestört", () => {
    expect(limitError(lists, { l1: "Vampir" }, { l1: { Vampir: 2 } }, { l1: "Vampir" })).toBeNull();
  });
  it("ohne Wert oder bei Freitext gibt es keine Prüfung", () => {
    expect(limitError(lists, {}, { l1: { Vampir: 9 } })).toBeNull();
    expect(limitError([{ ...lists[0], mode: "text" as const }], { l1: "Vampir" }, { l1: { Vampir: 9 } })).toBeNull();
  });
});

describe("Wesen abschalten", () => {
  const off: ChoiceList = { ...species, disabled: true };
  it("eine abgeschaltete Liste ist nicht aktiv und erscheint nicht im Profil", () => {
    expect(isListActive(off)).toBe(false);
    expect(activeLists([off, job])).toEqual([job]);
    expect(choiceEntries({ s: "Elf", j: "Bäcker" }, [off, job])).toEqual([{ label: "Beruf", value: "Bäcker" }]);
  });
  it("erkennt, ob die Welt Wesen abgeschaltet hat", () => {
    expect(isSpeciesOff([off, job])).toBe(true);
    expect(isSpeciesOff([species, job])).toBe(false);
    expect(isSpeciesOff([job])).toBe(false);
  });
  it("übernimmt keinen Wert für ein abgeschaltetes Wesen", () => {
    expect(parseChoices((k) => (k === "choice_s" ? "Elf" : null), [off])).toEqual({});
  });
});
