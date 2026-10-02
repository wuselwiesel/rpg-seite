import { describe, expect, it } from "vitest";
import { luckPointsFromGl } from "./charakterbogen-stats";

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
