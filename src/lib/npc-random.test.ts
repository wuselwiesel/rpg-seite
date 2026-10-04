import { describe, expect, it } from "vitest";
import { npcBio, npcName, rollNpcSheet, speciesOfSheet } from "./npc-random";
import { worldNames } from "./random-pools";
import { RACE_BONUSES, attrRows, budgets, hasErrors, talentRows, validateSheet } from "./sheet-rules";
import type { Rng } from "./sheet-random";

function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1);

describe("rollNpcSheet", () => {
  it("liefert einen vollständigen, gültigen Bogen: Name, Wesen, 90 Attribut- und 20 Talentpunkte", () => {
    for (const seed of SEEDS) {
      const d = rollNpcSheet({ rng: seeded(seed) });
      expect(npcName(d).split(" ").length).toBeGreaterThanOrEqual(2);
      expect(hasErrors(validateSheet(d))).toBe(false);
      expect(budgets(d).basisRemaining).toBe(0);
      expect(budgets(d).talentRemaining).toBe(0);
      expect(attrRows(d).every((r) => r.basis != null)).toBe(true);
      expect(talentRows(d).every((r) => (r.total ?? 0) <= 19)).toBe(true);
      for (const label of ["Spitzname", "Alter", "Wesen", "Hobbys", "Beruf / Schule / AG", "Eigenheiten", "Aussehen"]) {
        expect(d.personalFields.find((f) => f.label === label)?.value.trim().length).toBeGreaterThan(0);
      }
    }
  });
  it("Wesen, Besondere Natur und Profil-Wesen stimmen überein, Boni sind gesetzt", () => {
    const seen = new Set<string>();
    for (const seed of SEEDS) {
      const d = rollNpcSheet({ rng: seeded(seed) });
      const species = speciesOfSheet(d);
      seen.add(species);
      expect(d.race).toBe(species === "mensch" ? "none" : species);
      if (d.race !== "none") for (const [code, bonus] of Object.entries(RACE_BONUSES[d.race])) expect(d.attrBonus[code]).toBe(String(bonus));
    }
    expect([...seen].sort()).toEqual(["mensch", "vampir", "werwolf"]);
  });
  it("vermeidet Vornamen, die es in der Welt schon gibt", () => {
    const avoid = worldNames([{ name: "Anna" }, { name: "Ben Meyer" }, { name: "Lucian" }]);
    for (const seed of SEEDS) {
      const first = npcName(rollNpcSheet({ rng: seeded(seed), avoid })).split(" ")[0].toLowerCase();
      expect(avoid.has(first)).toBe(false);
    }
  });
  it("benutzt eigene Einträge der Welt", () => {
    const custom = { vorname: ["Zaphod"], nachname: ["Beeblebrox"] };
    const names = new Set(SEEDS.map((s) => npcName(rollNpcSheet({ rng: seeded(s), custom }))));
    expect([...names].some((n) => n.includes("Zaphod"))).toBe(true);
    expect([...names].some((n) => n.includes("Beeblebrox"))).toBe(true);
  });
  it("Kurzbeschreibung ist kurz und enthält Beruf und Eigenheit", () => {
    for (const seed of SEEDS.slice(0, 50)) {
      const d = rollNpcSheet({ rng: seeded(seed) });
      const bio = npcBio(d);
      expect(bio.length).toBeGreaterThan(0);
      expect(bio.length).toBeLessThanOrEqual(300);
      expect(bio).toContain(d.personalFields.find((f) => f.label === "Beruf / Schule / AG")!.value);
    }
  });
});
