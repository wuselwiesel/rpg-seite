import { describe, expect, it } from "vitest";
import {
  BERUF_POOLS,
  FIELD_DEFAULT_LABEL,
  FIRST_NAMES,
  RACE_WORDS,
  emptyCustomPools,
  fieldKind,
  pickMixed,
  raceOfSheet,
  rollAge,
  rollAllFields,
  rollRace,
  rollRow,
  rollValue,
  worldNames,
} from "./random-pools";
import { MAX_PERSONAL_FIELDS, RACE_BONUSES, emptySheet, type SheetData } from "./sheet-rules";
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
const value = (d: SheetData, label: string) => d.personalFields.find((f) => f.label === label)?.value ?? null;

describe("fieldKind erkennt Felder an der Bezeichnung", () => {
  it("Standard- und übliche Bezeichnungen", () => {
    expect(fieldKind("Vorname")).toBe("vorname");
    expect(fieldKind(" Nachname ")).toBe("nachname");
    expect(fieldKind("Spitzname")).toBe("spitzname");
    expect(fieldKind("Alter")).toBe("alter");
    expect(fieldKind("Wesen")).toBe("wesen");
    expect(fieldKind("Besondere Natur")).toBe("wesen");
    expect(fieldKind("Hobbys")).toBe("hobby");
    expect(fieldKind("Hobby & Interessen")).toBe("hobby");
    expect(fieldKind("Beruf / Schule / AG")).toBe("beruf");
    expect(fieldKind("Schule")).toBe("beruf");
    expect(fieldKind("Eigenheiten")).toBe("eigenheit");
    expect(fieldKind("Macke")).toBe("eigenheit");
    expect(fieldKind("Aussehen")).toBeNull();
    expect(fieldKind("Lebensziel / Wunsch")).toBe("lebensziel");
    expect(fieldKind("Geheimnis")).toBe("geheimnis");
    expect(fieldKind("Größte Angst")).toBe("angst");
  });
  it("Unbekanntes bekommt keinen Würfel", () => {
    for (const l of ["Titel", "Rang", "", "  ", "Lieblingsfarbe", "Größe", "Art"]) expect(fieldKind(l)).toBeNull();
  });
});

describe("Wesen und Alter", () => {
  it("rollRace: etwa 70 % Mensch, je 15 % Werwolf und Vampir", () => {
    const rng = seeded(11);
    const n = 6000;
    const c = { none: 0, werwolf: 0, vampir: 0 };
    for (let i = 0; i < n; i++) c[rollRace(rng)]++;
    expect(c.none / n).toBeGreaterThan(0.66);
    expect(c.none / n).toBeLessThan(0.74);
    expect(c.werwolf / n).toBeGreaterThan(0.12);
    expect(c.werwolf / n).toBeLessThan(0.18);
    expect(c.vampir / n).toBeGreaterThan(0.12);
    expect(c.vampir / n).toBeLessThan(0.18);
  });
  it("Alter richtet sich nach dem Wesen", () => {
    for (const seed of SEEDS) {
      const m = rollAge("none", seeded(seed));
      const w = rollAge("werwolf", seeded(seed));
      const v = rollAge("vampir", seeded(seed));
      expect(m).toBeGreaterThanOrEqual(14);
      expect(m).toBeLessThanOrEqual(70);
      expect(w).toBeGreaterThanOrEqual(16);
      expect(w).toBeLessThanOrEqual(60);
      expect(v).toBeGreaterThanOrEqual(80);
      expect(v).toBeLessThanOrEqual(650);
    }
  });
});

describe("rollValue", () => {
  it("liefert für jede Art nicht-leere, kurze Werte", () => {
    for (const seed of SEEDS) {
      const rng = seeded(seed);
      for (const k of ["vorname", "nachname", "spitzname", "alter", "wesen", "hobby", "beruf", "eigenheit", "lebensziel", "geheimnis", "angst", "geschlecht"] as const) {
        const v = rollValue(k, { rng });
        expect(v.trim().length).toBeGreaterThan(0);
        expect(v.length).toBeLessThanOrEqual(200);
      }
    }
  });
  it("Hobbys: zwei bis vier verschiedene, mit Komma getrennt", () => {
    for (const seed of SEEDS) {
      const parts = rollValue("hobby", { rng: seeded(seed) }).split(", ");
      expect(parts.length).toBeGreaterThanOrEqual(2);
      expect(parts.length).toBeLessThanOrEqual(4);
      expect(new Set(parts).size).toBe(parts.length);
    }
  });
  it("Beruf folgt dem Alter: Schule bis 18, Studium/Ausbildung bis 25, danach Beruf", () => {
    for (const seed of SEEDS) {
      expect(BERUF_POOLS.schule).toContain(rollValue("beruf", { rng: seeded(seed), age: 15 }));
      expect(BERUF_POOLS.jung).toContain(rollValue("beruf", { rng: seeded(seed), age: 22 }));
      expect(BERUF_POOLS.arbeit).toContain(rollValue("beruf", { rng: seeded(seed), age: 40 }));
    }
  });
  it("meidet vorhandene Vornamen", () => {
    const avoid = worldNames([{ name: "Anna Müller" }, { name: "Ben" }]);
    expect(avoid.has("anna") && avoid.has("ben")).toBe(true);
    for (const seed of SEEDS) {
      const v = rollValue("vorname", { rng: seeded(seed), avoid }).toLowerCase();
      expect(avoid.has(v)).toBe(false);
    }
  });
  it("eigene Einträge werden eingemischt, mehr Einträge heißt öfter", () => {
    const rng = seeded(5);
    const few = ["Sonnenblume"];
    const many = Array.from({ length: 24 }, (_, i) => `Eigen${i}`);
    const share = (own: string[]) => {
      let hits = 0;
      for (let i = 0; i < 3000; i++) if (own.includes(pickMixed(["A", "B", "C"], own, rng))) hits++;
      return hits / 3000;
    };
    expect(share(few)).toBeGreaterThan(0.06);
    expect(share(few)).toBeLessThan(0.18);
    expect(share(many)).toBeGreaterThan(0.65);
    expect(pickMixed(["A"], [], rng)).toBe("A");
    expect(pickMixed(["A"], ["  "], rng)).toBe("A");
    const custom = { ...emptyCustomPools(), vorname: ["Zaphod"] };
    const names = new Set(SEEDS.map((s) => rollValue("vorname", { rng: seeded(s), custom })));
    expect(names.has("Zaphod")).toBe(true);
  });
});

describe("rollAllFields („Alles zufällig“)", () => {
  it("füllt die leeren Standardfelder und legt fehlende an, Titel und Rang bleiben leer", () => {
    for (const seed of SEEDS) {
      const out = rollAllFields(emptySheet(), undefined, seeded(seed));
      for (const label of ["Vorname", "Nachname", "Spitzname", "Alter", "Wesen"]) expect(value(out, label)?.trim().length).toBeGreaterThan(0);
      for (const label of ["Hobbys", "Beruf / Schule / AG", "Eigenheiten", "Lebensziel / Wunsch", "Geheimnis", "Größte Angst", "Geschlecht"]) expect(value(out, label)?.trim().length).toBeGreaterThan(0);
      expect(value(out, "Titel")).toBe("");
      expect(value(out, "Rang")).toBe("");
      expect(out.personalFields.length).toBeLessThanOrEqual(MAX_PERSONAL_FIELDS);
      for (const f of out.personalFields) {
        expect(f.label.length).toBeLessThanOrEqual(40);
        expect(f.value.length).toBeLessThanOrEqual(200);
      }
    }
  });
  it("überschreibt nichts, was schon dasteht", () => {
    const base = emptySheet();
    base.personalFields = base.personalFields.map((f) => (f.label === "Vorname" ? { ...f, value: "Lyra" } : f.label === "Alter" ? { ...f, value: "17" } : f));
    for (const seed of SEEDS.slice(0, 100)) {
      const out = rollAllFields(base, undefined, seeded(seed));
      expect(value(out, "Vorname")).toBe("Lyra");
      expect(value(out, "Alter")).toBe("17");
    }
  });
  it("ein zweiter Durchlauf ändert nichts mehr (nur leere Felder werden gefüllt)", () => {
    for (const seed of SEEDS.slice(0, 100)) {
      const once = rollAllFields(emptySheet(), undefined, seeded(seed));
      const twice = rollAllFields(once, undefined, seeded(seed + 999));
      expect(twice.personalFields).toEqual(once.personalFields);
      expect(twice.race).toBe(once.race);
    }
  });
  it("Wesen und Besondere Natur stimmen überein, Boni der Natur sind gesetzt, Alter passt", () => {
    const seen = new Set<string>();
    for (const seed of SEEDS) {
      const out = rollAllFields(emptySheet(), undefined, seeded(seed));
      const wesen = value(out, "Wesen")!;
      seen.add(wesen);
      const expected = wesen === "Werwolf" ? "werwolf" : wesen === "Vampir" ? "vampir" : "none";
      expect(out.race).toBe(expected);
      expect(raceOfSheet(out)).toBe(expected);
      if (expected !== "none") for (const [code, bonus] of Object.entries(RACE_BONUSES[expected])) expect(out.attrBonus[code]).toBe(String(bonus));
      const age = Number(value(out, "Alter"));
      if (expected === "vampir") expect(age).toBeGreaterThanOrEqual(80);
      else expect(age).toBeLessThanOrEqual(70);
    }
    expect([...seen].sort()).toEqual(Object.values(RACE_WORDS).sort());
  });
  it("eine schon gewählte Besondere Natur bleibt, auch bei leerem Wesen-Feld", () => {
    const base = { ...emptySheet(), race: "werwolf" as const };
    for (const seed of SEEDS.slice(0, 50)) {
      const out = rollAllFields(base, undefined, seeded(seed));
      expect(out.race).toBe("werwolf");
      expect(value(out, "Wesen")).toBe("Werwolf");
    }
  });
  it("benutzt vorhandene Zeilen mit anderer Bezeichnung, statt doppelte anzulegen", () => {
    const base = emptySheet();
    base.personalFields = [...base.personalFields, { label: "Hobby", value: "" }, { label: "Wunsch", value: "" }];
    const out = rollAllFields(base, undefined, seeded(3));
    expect(out.personalFields.filter((f) => /hobb/i.test(f.label)).length).toBe(1);
    expect(out.personalFields.filter((f) => /wunsch|lebensziel/i.test(f.label)).length).toBe(1);
    expect(value(out, "Hobby")!.length).toBeGreaterThan(0);
    expect(value(out, "Wunsch")!.length).toBeGreaterThan(0);
  });
  it("hält die Höchstzahl an Zeilen ein", () => {
    const base = emptySheet();
    base.personalFields = Array.from({ length: MAX_PERSONAL_FIELDS }, (_, i) => ({ label: `Feld ${i}`, value: "x" }));
    const out = rollAllFields(base, undefined, seeded(1));
    expect(out.personalFields.length).toBe(MAX_PERSONAL_FIELDS);
  });
});

describe("rollRow (Würfel je Zeile)", () => {
  it("ersetzt den Wert der Zeile, andere bleiben", () => {
    const base = rollAllFields(emptySheet(), undefined, seeded(2));
    const i = base.personalFields.findIndex((f) => f.label === "Spitzname");
    let changed = false;
    for (const seed of SEEDS.slice(0, 40)) {
      const out = rollRow(base, i, undefined, seeded(seed));
      if (out.personalFields[i].value !== base.personalFields[i].value) changed = true;
      out.personalFields.forEach((f, j) => {
        if (j !== i) expect(f).toEqual(base.personalFields[j]);
      });
    }
    expect(changed).toBe(true);
  });
  it("Wesen: setzt auch die Besondere Natur, und beim Wechsel verschwinden die alten Boni", () => {
    const base = rollAllFields(emptySheet(), undefined, seeded(8));
    const i = base.personalFields.findIndex((f) => f.label === "Wesen");
    for (const seed of SEEDS.slice(0, 80)) {
      const out = rollRow(base, i, undefined, seeded(seed));
      const wesen = out.personalFields[i].value;
      const race = wesen === "Werwolf" ? "werwolf" : wesen === "Vampir" ? "vampir" : "none";
      expect(out.race).toBe(race);
      const wanted = race === "none" ? {} : RACE_BONUSES[race];
      for (const code of ["MU", "GE", "KO", "IN", "KK", "CH", "SB"]) expect(out.attrBonus[code] ?? "").toBe(String((wanted as Record<string, number>)[code] ?? ""));
    }
  });
  it("Alter richtet sich nach dem Wesen der Zeile darüber", () => {
    const base = { ...emptySheet(), race: "vampir" as const };
    const i = base.personalFields.findIndex((f) => f.label === "Alter");
    for (const seed of SEEDS.slice(0, 60)) expect(Number(rollRow(base, i, undefined, seeded(seed)).personalFields[i].value)).toBeGreaterThanOrEqual(80);
  });
  it("lässt unbekannte Zeilen unverändert", () => {
    const base = emptySheet();
    const i = base.personalFields.findIndex((f) => f.label === "Titel");
    expect(rollRow(base, i, undefined, seeded(1))).toBe(base);
    expect(rollRow(base, 99, undefined, seeded(1))).toBe(base);
  });
  it("Standard-Bezeichnungen sind alle erkennbar", () => {
    for (const [kind, label] of Object.entries(FIELD_DEFAULT_LABEL)) expect(fieldKind(label)).toBe(kind);
  });
});

describe("Geschlecht", () => {
  it("wird erkannt, gewürfelt und der Vorname passt dazu", () => {
    expect(fieldKind("Geschlecht")).toBe("geschlecht");
    const seen = new Set<string>();
    for (const seed of SEEDS) {
      const out = rollAllFields(emptySheet(), undefined, seeded(seed));
      const g = value(out, "Geschlecht")!;
      seen.add(g);
      expect(["weiblich", "männlich", "divers"]).toContain(g);
      const first = value(out, "Vorname")!;
      if (g === "weiblich") expect(FIRST_NAMES.w).toContain(first);
      if (g === "männlich") expect(FIRST_NAMES.m).toContain(first);
    }
    expect(seen.size).toBe(3);
  });
  it("Würfel der Zeile würfelt das Geschlecht neu", () => {
    const base = rollAllFields(emptySheet(), undefined, seeded(1));
    const index = base.personalFields.findIndex((f) => f.label === "Geschlecht");
    const seen = new Set(SEEDS.map((s) => rollRow(base, index, undefined, seeded(s)).personalFields[index].value));
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe("eigene Listen der Welt", () => {
  it("jede Art mischt eigene Einträge ein (und gibt weiter mitgelieferte aus)", () => {
    const kinds = ["vorname", "nachname", "spitzname", "hobby", "beruf", "eigenheit", "lebensziel", "geheimnis", "angst"] as const;
    for (const kind of kinds) {
      const custom = { ...emptyCustomPools(), [kind]: ["EIGENER EINTRAG"] };
      const values = SEEDS.map((s) => rollValue(kind, { rng: seeded(s), custom }));
      const own = values.filter((v) => v.includes("EIGENER EINTRAG")).length;
      expect(own, kind).toBeGreaterThan(0);
      expect(own, kind).toBeLessThan(values.length);
    }
  });
  it("Alles zufällig nutzt eigene Einträge (Geheimnis, Lebensziel, Angst)", () => {
    const custom = { ...emptyCustomPools(), geheimnis: ["G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8", "G9", "G10"], angst: ["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9", "A10"] };
    const hits = SEEDS.filter((s) => {
      const out = rollAllFields(emptySheet(), custom, seeded(s));
      return /^G\d+$/.test(value(out, "Geheimnis") ?? "") && /^A\d+$/.test(value(out, "Größte Angst") ?? "");
    }).length;
    expect(hits).toBeGreaterThan(10);
  });
});
