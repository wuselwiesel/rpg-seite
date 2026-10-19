import { describe, expect, it } from "vitest";
import { speciesLabelOf, speciesListOf } from "./world-species";

describe("speciesLabelOf", () => {
  const withOptions = { id: "w", hasOptions: true };
  it("nimmt den Wert der Wesen-Liste", () => {
    expect(speciesLabelOf({ choices: { w: "Elf" }, species: "mensch" }, withOptions)).toBe("Elf");
  });
  it("zeigt nichts, wenn die Liste Einträge hat und keiner gewählt ist", () => {
    expect(speciesLabelOf({ choices: {}, species: "mensch" }, withOptions)).toBeNull();
  });
  it("fällt ohne Einträge auf die feste Natur zurück", () => {
    expect(speciesLabelOf({ choices: {}, species: "vampir" }, { id: "w", hasOptions: false })).toBe("Vampir");
    expect(speciesLabelOf({ species: "werwolf" }, null)).toBe("Werwolf");
    expect(speciesLabelOf({ species: "mensch" }, null)).toBe("Mensch");
  });
});

describe("speciesListOf", () => {
  it("findet die Wesen-Liste und ob sie Einträge hat", () => {
    expect(speciesListOf([{ id: "a", isSpecies: false, mode: "dropdown", options: [] }, { id: "w", isSpecies: true, mode: "dropdown", options: [1] }])).toEqual({ id: "w", hasOptions: true });
    expect(speciesListOf([{ id: "w", isSpecies: true, mode: "dropdown", options: [] }])).toEqual({ id: "w", hasOptions: false });
    expect(speciesListOf([])).toBeNull();
  });
});

describe("Wesen abgeschaltet", () => {
  it("zeigt keine Angabe, auch nicht die feste Natur", () => {
    const off = speciesListOf([{ id: "w", isSpecies: true, mode: "dropdown", options: [{}], disabled: true }]);
    expect(off).toEqual({ id: "w", hasOptions: true, off: true });
    expect(speciesLabelOf({ choices: { w: "Elf" }, species: "vampir" }, off)).toBeNull();
  });
  it("eingeschaltet bleibt alles wie bisher", () => {
    const on = speciesListOf([{ id: "w", isSpecies: true, mode: "dropdown", options: [{}] }]);
    expect(on).toEqual({ id: "w", hasOptions: true });
    expect(speciesLabelOf({ choices: { w: "Elf" } }, on)).toBe("Elf");
  });
});
