import { describe, expect, it } from "vitest";
import { ATTR_TABLE } from "@/lib/charakterbogen-stats";
import { allocate, LUCK_STEPS, pick, randInt, rollAttributes, rollTalents, shuffle, type Rng } from "./sheet-random";
import { applyRace, attrRows, budgets, emptySheet, hasErrors, talentRows, validateSheet, type SheetData } from "./sheet-rules";

// Fester Zufall (mulberry32), damit die Läufe wiederholbar sind.
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

const SEEDS = Array.from({ length: 400 }, (_, i) => i + 1);
const basisOf = (d: SheetData) => Object.fromEntries(attrRows(d).map((r) => [r.code, r.basis]));

describe("allocate", () => {
  it("verteilt genau die Summe und hält Mindest- und Höchstwerte ein", () => {
    for (const seed of SEEDS) {
      const rng = seeded(seed);
      const n = randInt(rng, 2, 12);
      const mins = Array.from({ length: n }, () => randInt(rng, 0, 2));
      const maxs = mins.map((m) => m + randInt(rng, 1, 15));
      const total = randInt(rng, mins.reduce((s, m) => s + m, 0), maxs.reduce((s, m) => s + m, 0));
      const out = allocate(total, Array.from({ length: n }, () => 0.1 + rng() * 5), mins, maxs);
      expect(out.reduce((s, v) => s + v, 0)).toBe(total);
      out.forEach((v, i) => {
        expect(Number.isInteger(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(mins[i]);
        expect(v).toBeLessThanOrEqual(maxs[i]);
      });
    }
  });
  it("verteilt so viel wie möglich, wenn die Summe nicht passt", () => {
    expect(allocate(100, [1, 1], [0, 0], [3, 4])).toEqual([3, 4]);
    expect(allocate(0, [1, 1], [1, 2], [5, 5])).toEqual([1, 2]);
  });
});

describe("rollAttributes", () => {
  for (const style of ["ausgewogen", "wild"] as const) {
    it(`${style}: genau 90 Punkte, Basis 1–19, Glück nur 1/5/10/15, Boni bleiben`, () => {
      const base = applyRace(emptySheet(), "vampir");
      for (const seed of SEEDS) {
        const out = rollAttributes(base, style, seeded(seed));
        const basis = basisOf(out);
        const sum = Object.values(basis).reduce<number>((s, v) => s + (v ?? 0), 0);
        expect(sum).toBe(90);
        for (const a of ATTR_TABLE) {
          expect(basis[a.code]).toBeGreaterThanOrEqual(1);
          expect(basis[a.code]).toBeLessThanOrEqual(19);
        }
        expect(LUCK_STEPS as readonly number[]).toContain(basis.GL);
        expect(out.attrBonus).toEqual(base.attrBonus);
        expect(out.race).toBe("vampir");
        expect(budgets(out).basisRemaining).toBe(0);
        expect(hasErrors(validateSheet(out))).toBe(false);
      }
    });
  }
  it("benutzt alle vier Glücksstufen, wenn man oft genug würfelt (wild)", () => {
    const seen = new Set<number>();
    for (const seed of SEEDS) seen.add(basisOf(rollAttributes(emptySheet(), "wild", seeded(seed))).GL!);
    expect([...seen].sort((a, b) => a - b)).toEqual([1, 5, 10, 15]);
  });
  it("wild streut deutlich stärker als ausgewogen", () => {
    const spread = (style: "ausgewogen" | "wild") => {
      let total = 0;
      for (const seed of SEEDS.slice(0, 200)) {
        const v = Object.entries(basisOf(rollAttributes(emptySheet(), style, seeded(seed)))).filter(([c]) => c !== "GL").map(([, x]) => x!);
        const mean = v.reduce((s, x) => s + x, 0) / v.length;
        total += Math.sqrt(v.reduce((s, x) => s + (x - mean) ** 2, 0) / v.length);
      }
      return total / 200;
    };
    expect(spread("wild")).toBeGreaterThan(spread("ausgewogen") * 1.5);
  });
  it("ändert das Original nicht und liefert gleiche Ergebnisse bei gleichem Seed", () => {
    const base = emptySheet();
    const a = rollAttributes(base, "wild", seeded(7));
    expect(base.attrBasis).toEqual({});
    expect(rollAttributes(base, "wild", seeded(7))).toEqual(a);
  });
});

describe("rollTalents", () => {
  const withAttrs = (seed: number, race: "none" | "werwolf" | "vampir" = "none") => rollAttributes(applyRace(emptySheet(), race), "ausgewogen", seeded(seed + 1000));

  for (const style of ["spezialist", "allrounder"] as const) {
    it(`${style}: genau 20 Punkte, keine negativen Boni, Basis + Bonus höchstens 19`, () => {
      for (const seed of SEEDS) {
        const data = withAttrs(seed, seed % 3 === 0 ? "werwolf" : seed % 3 === 1 ? "vampir" : "none");
        const out = rollTalents(data, style, seeded(seed));
        const rows = talentRows(out);
        expect(rows.reduce((s, r) => s + (r.bonus ?? 0), 0)).toBe(20);
        for (const r of rows) {
          expect(r.bonus ?? 0).toBeGreaterThanOrEqual(0);
          expect((r.bonus ?? 0) + (r.basis ?? 0)).toBeLessThanOrEqual(19);
          expect(r.capped).toBe(false);
        }
        expect(budgets(out).talentRemaining).toBe(0);
        expect(hasErrors(validateSheet(out))).toBe(false);
        expect(out.attrBasis).toEqual(data.attrBasis);
        expect(out.attrBonus).toEqual(data.attrBonus);
      }
    });
  }
  it("Spezialist:in: 3–6 Talente (mehr nur, wenn die Obergrenzen nicht reichen)", () => {
    for (const seed of SEEDS) {
      const out = rollTalents(withAttrs(seed), "spezialist", seeded(seed));
      const n = talentRows(out).filter((r) => (r.bonus ?? 0) > 0).length;
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(8);
    }
  });
  it("Allrounder:in: 10–16 Talente mit je 1–3 Punkten", () => {
    for (const seed of SEEDS) {
      const out = rollTalents(withAttrs(seed), "allrounder", seeded(seed));
      const bonuses = talentRows(out).map((r) => r.bonus ?? 0).filter((b) => b > 0);
      expect(bonuses.length).toBeGreaterThanOrEqual(7);
      expect(bonuses.length).toBeLessThanOrEqual(16);
      for (const b of bonuses) {
        expect(b).toBeGreaterThanOrEqual(1);
        expect(b).toBeLessThanOrEqual(3);
      }
    }
  });
  it("funktioniert auch ohne Attribute (Basis zählt dann 0)", () => {
    for (const seed of SEEDS.slice(0, 100)) {
      const out = rollTalents(emptySheet(), seed % 2 ? "spezialist" : "allrounder", seeded(seed));
      expect(talentRows(out).reduce((s, r) => s + (r.bonus ?? 0), 0)).toBe(20);
    }
  });
  it("hält die Obergrenze 19 − Basis, auch wenn nicht alle 20 Punkte unterzubringen sind", () => {
    const high: SheetData = { ...emptySheet(), attrBasis: Object.fromEntries(ATTR_TABLE.map((a) => [a.code, "19"])) };
    const out = rollTalents(high, "spezialist", seeded(1));
    const rows = talentRows(out);
    expect(rows.every((r) => (r.bonus ?? 0) === 0)).toBe(true);
    const nearly: SheetData = { ...emptySheet(), attrBasis: Object.fromEntries(ATTR_TABLE.map((a) => [a.code, "18"])) };
    const out2 = rollTalents(nearly, "allrounder", seeded(2));
    expect(talentRows(out2).every((r) => (r.bonus ?? 0) + (r.basis ?? 0) <= 19)).toBe(true);
    expect(talentRows(out2).reduce((s, r) => s + (r.bonus ?? 0), 0)).toBeLessThanOrEqual(20);
  });
  it("lässt Rassen-Boni der Attribute unangetastet und ersetzt alte Talent-Boni vollständig", () => {
    const first = rollTalents(withAttrs(5, "werwolf"), "spezialist", seeded(3));
    const second = rollTalents(first, "allrounder", seeded(4));
    expect(second.attrBonus).toEqual(first.attrBonus);
    expect(talentRows(second).reduce((s, r) => s + (r.bonus ?? 0), 0)).toBe(20);
  });
});

describe("Hilfsfunktionen", () => {
  it("shuffle mischt ohne zu verlieren, pick bleibt im Bereich", () => {
    const list = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = shuffle(list, seeded(9));
    expect([...out].sort((a, b) => a - b)).toEqual(list);
    expect(list).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    for (const seed of SEEDS) expect(list).toContain(pick(list, seeded(seed)));
    expect(pick(["x"], () => 0.9999999)).toBe("x");
  });
});
