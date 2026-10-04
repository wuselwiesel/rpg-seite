import { describe, expect, it } from "vitest";
import { DICE_CONDITIONS, resolveCondition } from "./dice-conditions";

describe("resolveCondition", () => {
  it("Betrunken in vier Stufen, jede mit einem eigenen Malus", () => {
    const betrunken = DICE_CONDITIONS.find((c) => c.id === "betrunken");
    expect(betrunken?.levels.map((l) => l.label)).toEqual(["Leicht", "Mittel", "Stark", "Sehr stark"]);
    const maluses = betrunken!.levels.map((l) => l.malus);
    expect(maluses.every((m) => m < 0)).toBe(true);
    // je stärker, desto größer der Abzug
    expect([...maluses].sort((a, b) => b - a)).toEqual(maluses);
    expect(new Set(maluses).size).toBe(4);
  });
  it("löst Zustand und Stufe zu Text und Malus auf", () => {
    expect(resolveCondition("betrunken:stark")).toEqual({ text: "Betrunken (stark)", malus: -6 });
    expect(resolveCondition("betrunken:sehr_stark")?.text).toBe("Betrunken (sehr stark)");
  });
  it("unbekannt oder leer ist keine Erschwernis", () => {
    expect(resolveCondition("")).toBeNull();
    expect(resolveCondition(null)).toBeNull();
    expect(resolveCondition("betrunken")).toBeNull();
    expect(resolveCondition("betrunken:extrem")).toBeNull();
    expect(resolveCondition("müde:leicht")).toBeNull();
  });
});
