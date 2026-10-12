import { describe, expect, it } from "vitest";
import { activeLists, choiceEntries, isListActive, parseChoices, speciesFromLabel, splitOptionLabels, type ChoiceList } from "./choice-lists";

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
