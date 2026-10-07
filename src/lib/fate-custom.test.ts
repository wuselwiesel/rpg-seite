import { describe, expect, it } from "vitest";
import { analyzeFateText, cleanRoles, describeRole, previewFateText, rowToFate } from "./fate-custom";

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

describe("cleanRoles", () => {
  it("behält nur Rollen, die der Text benutzt, und nur bekannte Werte", () => {
    const raw = { "1": { gender: "weiblich", species: ["vampir", "unsinn"] }, "2": { relation: "partner", gender: "x" }, "3": { gender: "maennlich" } };
    expect(cleanRoles(raw, 1)).toEqual({ "1": { gender: "weiblich", species: ["vampir"] }, "2": { relation: "partner" } });
  });
  it("ignoriert Beziehungen bei Charakter 1 und alle drei Wesen (= egal)", () => {
    expect(cleanRoles({ "1": { relation: "partner", species: ["mensch", "vampir", "werwolf"] } }, 0)).toEqual({});
  });
  it("verträgt Unsinn", () => {
    expect(cleanRoles(null, 2)).toEqual({});
    expect(cleanRoles("x", 2)).toEqual({});
  });
});

describe("Bedingungen im Schicksal", () => {
  it("werden an Charakter 1 und die Zusatz-Charaktere weitergegeben", () => {
    const f = rowToFate({ id: "a", category: "Beziehung", severity: "mittel", text: "{character1} und {character2}", targets: 1, created_by: "u", roles: { "1": { species: ["vampir"] }, "2": { relation: "bestFriend" } } });
    expect(f?.char1).toEqual({ species: ["vampir"] });
    expect(f?.roles).toEqual([{ relation: "bestFriend" }]);
  });
  it("beschreibt Bedingungen kurz", () => {
    expect(describeRole({ gender: "weiblich", species: ["vampir", "werwolf"] })).toBe("weiblich, Vampir oder Werwolf");
    expect(describeRole({ relation: "partner" })).toBe("Partner:in von Charakter 1");
    expect(describeRole(undefined)).toBe("");
  });
});
