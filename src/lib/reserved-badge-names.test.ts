import { describe, expect, it } from "vitest";
import { isReservedBadgeName } from "./reserved-badge-names";

describe("isReservedBadgeName", () => {
  it("sperrt Namen, die wie ein Siegel wirken", () => {
    for (const n of ["Verifiziert", "verified", "✔ Offiziell", "App-Bastler", "App Bastlerin", "Wortwinkel Team", "Admin", "Moderator:in"]) {
      expect(isReservedBadgeName(n)).toBe(true);
    }
  });
  it("lässt normale Badge-Namen zu", () => {
    for (const n of ["Nachteule", "Sternenstaub", "Schreibwut", "Teamplayer", "Mondkind"]) {
      expect(isReservedBadgeName(n)).toBe(false);
    }
  });
});
