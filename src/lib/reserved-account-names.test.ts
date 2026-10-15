import { describe, expect, it } from "vitest";
import { isReservedAccountName } from "./reserved-account-names";

describe("isReservedAccountName", () => {
  it("sperrt Namen, die nach dem offiziellen Konto klingen", () => {
    for (const n of ["Wortwinkel", "wort_winkel", "Wort-Winkel Team", "WORTWINKEL.official", "Offiziell", "Admin", "admin_anna", "Support"]) {
      expect(isReservedAccountName(n)).toBe(true);
    }
  });
  it("lässt normale Namen zu", () => {
    for (const n of ["Streuselschnecke", "Hörnchen", "Nadine", "Teamgeist", "Kirschplunder", "SaniWitch"]) {
      expect(isReservedAccountName(n)).toBe(false);
    }
  });
});
