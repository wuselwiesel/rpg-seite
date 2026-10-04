import { describe, expect, it } from "vitest";
import { getStatOptions, luckPointsFromGl } from "./charakterbogen-stats";

describe("luckPointsFromGl", () => {
  it("rechnet den Glück-Basiswert in Glückspunkte um (abgerundet(GL ÷ 5) + 1)", () => {
    expect(luckPointsFromGl(1)).toBe(1);
    expect(luckPointsFromGl(4)).toBe(1);
    expect(luckPointsFromGl(5)).toBe(2);
    expect(luckPointsFromGl(9)).toBe(2);
    expect(luckPointsFromGl(10)).toBe(3);
    expect(luckPointsFromGl(14)).toBe(3);
    expect(luckPointsFromGl(15)).toBe(4);
    expect(luckPointsFromGl(19)).toBe(4);
  });

  it("gibt ohne Glückswert keine Punkte", () => {
    expect(luckPointsFromGl(0)).toBe(0);
    expect(luckPointsFromGl(Number.NaN)).toBe(0);
  });
});

describe("getStatOptions", () => {
  it("zählt Attribute als Basis plus Bonus", () => {
    const o = getStatOptions({ attrBasis: { MU: "10" }, attrBonus: { MU: "3" } }).find((x) => x.name === "Mut");
    expect(o?.value).toBe(13);
    expect(o?.base).toBe(10);
  });
  it("deckelt Talente bei 19", () => {
    const o = getStatOptions({ talentBasis: { talent_klettern: "18" }, talentBonus: { talent_klettern: "4" } }).find((x) => x.name === "Klettern");
    expect(o?.value).toBe(19);
  });
  it("lässt Talente unter 19 unverändert", () => {
    const o = getStatOptions({ talentBasis: { talent_singen: "8" }, talentBonus: { talent_singen: "3" } }).find((x) => x.name === "Singen");
    expect(o?.value).toBe(11);
  });
});
