// Zufällige Verteilung von Attributen und Talenten für den ChaBo. Rein; die Zufallsquelle kommt als Parameter (`Rng`, Zahl in [0, 1)),
// damit Tests mit festem Seed laufen. Regeln wie in sheet-rules.ts: Attribute Basis 1–19, genau 90 Punkte, Glück nur 1/5/10/15;
// Talente genau 20 Bonuspunkte, Bonus 0–19 (keine negativen), Gesamtwert (Basis + Bonus) höchstens 19. Rassen-Boni bleiben unangetastet.
import { ATTR_TABLE, TALENT_LIST, talentSlug } from "@/lib/charakterbogen-stats";
import {
  BASIS_BUDGET,
  BASIS_MAX,
  BASIS_MIN,
  TALENT_BONUS_BUDGET,
  TALENT_BONUS_MAX,
  talentRows,
  withDerived,
  type SheetData,
} from "@/lib/sheet-rules";

export type Rng = () => number;
export type AttrStyle = "ausgewogen" | "wild";
export type TalentStyle = "spezialist" | "allrounder";

export const LUCK_STEPS = [1, 5, 10, 15] as const;

// Gleichverteilte ganze Zahl von min bis max (einschließlich).
export function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

// Mischen (Fisher-Yates) ohne das Original zu verändern.
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function pick<T>(items: readonly T[], rng: Rng): T {
  return items[Math.min(items.length - 1, Math.floor(rng() * items.length))];
}

// Verteilt `total` ganze Punkte auf Einträge mit Mindest- und Höchstwert, im Verhältnis der Gewichte.
// Erst kommen die Mindestwerte, der Rest wird proportional verteilt (Einträge am Höchstwert geben ihren Überschuss weiter),
// am Ende gleicht das Größte-Reste-Verfahren die Rundung aus. Passt `total` nicht in [Σmin, Σmax], wird so nah wie möglich verteilt.
export function allocate(total: number, weights: number[], mins: number[], maxs: number[]): number[] {
  const n = weights.length;
  const out = mins.slice();
  const remaining = Math.max(0, Math.min(total, maxs.reduce((s, m) => s + m, 0)) - mins.reduce((s, m) => s + m, 0));
  const extra = new Array<number>(n).fill(0);
  const cap = maxs.map((m, i) => Math.max(0, m - mins[i]));
  let active = Array.from({ length: n }, (_, i) => i).filter((i) => cap[i] > 0 && weights[i] > 0);
  let rest = remaining;
  while (rest > 1e-9 && active.length) {
    const wsum = active.reduce((s, i) => s + weights[i], 0);
    const over = active.filter((i) => extra[i] + (rest * weights[i]) / wsum > cap[i]);
    if (over.length === 0) {
      for (const i of active) extra[i] += (rest * weights[i]) / wsum;
      rest = 0;
      break;
    }
    for (const i of over) {
      rest -= cap[i] - extra[i];
      extra[i] = cap[i];
    }
    active = active.filter((i) => !over.includes(i));
  }
  // Ganzzahlig machen: abrunden, den Rest an die größten Nachkommastellen mit Platz verteilen.
  const floors = extra.map((e) => Math.floor(e + 1e-9));
  let left = remaining - floors.reduce((s, f) => s + f, 0);
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => extra[b] - floors[b] - (extra[a] - floors[a]) || weights[b] - weights[a]);
  while (left > 0) {
    let progressed = false;
    for (const i of order) {
      if (left <= 0) break;
      if (floors[i] < cap[i]) {
        floors[i] += 1;
        left -= 1;
        progressed = true;
      }
    }
    if (!progressed) break;
  }
  for (let i = 0; i < n; i++) out[i] += floors[i];
  return out;
}

// Gewicht für die Streuung: „ausgewogen“ liegt eng beieinander, „wild“ hat Ausreißer nach oben und unten.
function attrWeight(style: AttrStyle, rng: Rng): number {
  return style === "ausgewogen" ? 1 + rng() * 0.6 : -Math.log(1 - rng() * 0.995) + 0.05;
}

function luckFor(style: AttrStyle, rng: Rng): number {
  // ausgewogen: meist 5 oder 10 (2–3 Glückspunkte); wild: jede Stufe gleich oft
  if (style === "wild") return pick(LUCK_STEPS, rng);
  const r = rng();
  return r < 0.1 ? 1 : r < 0.45 ? 5 : r < 0.9 ? 10 : 15;
}

// Alle zehn Basiswerte neu würfeln: Summe genau 90, je 1–19, Glück nur in Stufen. Boni (z. B. von der Besonderen Natur) bleiben.
export function rollAttributes(data: SheetData, style: AttrStyle, rng: Rng): SheetData {
  const luck = luckFor(style, rng);
  const others = ATTR_TABLE.filter((a) => a.code !== "GL");
  const values = allocate(
    BASIS_BUDGET - luck,
    others.map(() => attrWeight(style, rng)),
    others.map(() => BASIS_MIN),
    others.map(() => BASIS_MAX),
  );
  const attrBasis: Record<string, string> = { ...data.attrBasis, GL: String(luck) };
  others.forEach((a, i) => {
    attrBasis[a.code] = String(values[i]);
  });
  return withDerived({ ...data, attrBasis });
}

// Talent-Bonuspunkte neu würfeln: genau 20 (soweit die Obergrenzen reichen), keine negativen Boni, Basis + Bonus höchstens 19.
// Spezialist:in: 3–6 Talente mit vielen Punkten. Allrounder:in: 10–16 Talente mit je 1–3.
export function rollTalents(data: SheetData, style: TalentStyle, rng: Rng): SheetData {
  const rows = talentRows(data);
  const caps = rows.map((r) => Math.max(0, Math.min(TALENT_BONUS_MAX, TALENT_BONUS_MAX - (r.basis ?? 0))));
  const eligible = shuffle(
    rows.map((_, i) => i).filter((i) => caps[i] > 0),
    rng,
  );
  const bonus = new Array<number>(rows.length).fill(0);

  if (eligible.length > 0) {
    let chosen: number[];
    let min = 0;
    let top = 0;
    if (style === "spezialist") {
      chosen = eligible.slice(0, randInt(rng, 3, 6));
      // Reichen die Obergrenzen der Gewählten nicht für 20 Punkte, kommen weitere Talente dazu.
      let next = chosen.length;
      while (next < eligible.length && chosen.reduce((s, i) => s + caps[i], 0) < TALENT_BONUS_BUDGET) chosen.push(eligible[next++]);
    } else {
      chosen = eligible.slice(0, randInt(rng, 10, 16));
      min = 1;
      top = 3;
    }
    const mins = chosen.map((i) => Math.min(min, caps[i]));
    const maxs = chosen.map((i) => (style === "allrounder" ? Math.min(top, caps[i]) : caps[i]));
    const weights = chosen.map(() => 1 + rng());
    let values = allocate(TALENT_BONUS_BUDGET, weights, mins, maxs);
    // Allrounder: Reicht 1–3 je Talent nicht für 20, lockern wir die Obergrenze (sonst blieben Punkte übrig).
    if (style === "allrounder" && values.reduce((s, v) => s + v, 0) < TALENT_BONUS_BUDGET) {
      values = allocate(TALENT_BONUS_BUDGET, weights, mins, chosen.map((i) => caps[i]));
    }
    chosen.forEach((idx, k) => {
      bonus[idx] = values[k];
    });
  }

  const talentBonus: Record<string, string> = { ...data.talentBonus };
  TALENT_LIST.forEach((name) => {
    const idx = rows.findIndex((r) => r.name === name);
    talentBonus[talentSlug(name)] = idx >= 0 && bonus[idx] > 0 ? String(bonus[idx]) : "";
  });
  return withDerived({ ...data, talentBonus });
}
