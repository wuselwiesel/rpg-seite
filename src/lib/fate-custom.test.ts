import { describe, expect, it } from "vitest";
import { analyzeFateText, previewFateText, rowToFate } from "./fate-custom";

describe("analyzeFateText", () => {
  it("zählt die Zusatz-Charaktere am höchsten Platzhalter", () => {
    expect(analyzeFateText("{character1} verliert den Schlüssel.")).toEqual({ text: "{character1} verliert den Schlüssel.", targets: 0 });
    expect(analyzeFateText("{character1} streitet mit {character2}.")).toMatchObject({ targets: 1 });
    expect(analyzeFateText("{character1} erwischt {character2} und {character3}.")).toMatchObject({ targets: 2 });
  });
  it("braucht {character1} und lückenlose Platzhalter", () => {
    expect("error" in analyzeFateText("Jemand verliert den Schlüssel.")).toBe(true);
    expect("error" in analyzeFateText("{character1} sieht {character3}.")).toBe(true);
  });
  it("lehnt fremde Platzhalter und zu kurze oder lange Texte ab", () => {
    expect("error" in analyzeFateText("{character1} hat {name} verloren.")).toBe(true);
    expect("error" in analyzeFateText("Hi")).toBe(true);
    expect("error" in analyzeFateText(`{character1} ${"x".repeat(600)}`)).toBe(true);
  });
  it("macht aus mehreren Leerzeichen eins", () => {
    expect(analyzeFateText("  {character1}   fällt \n hin.  ")).toEqual({ text: "{character1} fällt hin.", targets: 0 });
  });
});

describe("rowToFate", () => {
  it("baut ein Schicksal mit fester Zahl Zusatz-Charaktere", () => {
    const f = rowToFate({ id: "abc", category: "Gefahr", severity: "schwer", text: "{character1} und {character2}", targets: 1, created_by: "u" });
    expect(f).toMatchObject({ id: "abc", minTargets: 1, maxTargets: 1, roles: [{}] });
  });
  it("lässt unbekannte Kategorien aus", () => {
    expect(rowToFate({ id: "x", category: "Unsinn", severity: "leicht", text: "{character1}", targets: 0, created_by: "u" })).toBeNull();
  });
});

describe("previewFateText", () => {
  it("setzt Beispielnamen ein", () => {
    expect(previewFateText("{character1} trifft {character2}")).toBe("Mira trifft Jonas");
  });
});
