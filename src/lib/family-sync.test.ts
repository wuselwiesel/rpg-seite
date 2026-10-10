import { describe, expect, it } from "vitest";
import { canonicalLabel, singleMentionId } from "./family-sync";
import { guessRelation } from "./relationships";

const chars = [
  { id: "a", name: "Amber Montgomery" },
  { id: "t", name: "Tilo Sanchez" },
  { id: "s", name: "Self" },
];

describe("singleMentionId", () => {
  it("findet genau eine andere Figur", () => {
    expect(singleMentionId("@Amber Montgomery ", chars, "s")).toBe("a");
  });
  it("ignoriert die eigene Figur und mehrere Treffer", () => {
    expect(singleMentionId("@Self", chars, "s")).toBeNull();
    expect(singleMentionId("@Amber Montgomery und @Tilo Sanchez", chars, "s")).toBeNull();
    expect(singleMentionId("niemand", chars, "s")).toBeNull();
  });
});

describe("guessRelation", () => {
  it("erkennt Eltern, Kinder, Geschwister und Freundschaft", () => {
    expect(guessRelation("Mutter")).toMatchObject({ category: "familie", familyRole: "eltern", targetIsParent: true });
    expect(guessRelation("Sohn")).toMatchObject({ category: "familie", familyRole: "eltern", targetIsParent: false });
    expect(guessRelation("Bruder")).toMatchObject({ familyRole: "geschwister" });
    expect(guessRelation("Beste Freundin")).toMatchObject({ category: "freundschaft", familyRole: null });
    expect(guessRelation("(Ex-)Freund")).toMatchObject({ category: "liebe" });
    expect(guessRelation("Irgendwas")).toMatchObject({ category: "sonstiges" });
  });
});

describe("canonicalLabel", () => {
  it("benennt Eltern-Beziehungen aus der Sicht der Figur", () => {
    expect(canonicalLabel({ type: "Mutter", family_role: "eltern" }, true)).toBe("Kind");
    expect(canonicalLabel({ type: "Mutter", family_role: "eltern" }, false)).toBe("Elternteil");
    expect(canonicalLabel({ type: "Befreundet", family_role: null }, true)).toBe("Befreundet");
  });
});
