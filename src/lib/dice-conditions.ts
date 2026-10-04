// Zustände, die einen Wurf erschweren (z. B. „Betrunken“). Jede Stufe zieht einen festen Wert vom Zielwert ab.
// Die Zahlen stehen nur hier; zum Ändern genügt es, sie in DICE_CONDITIONS anzupassen.

export type ConditionLevel = { id: string; label: string; malus: number };
export type DiceCondition = { id: string; label: string; levels: ConditionLevel[] };

export const DICE_CONDITIONS: DiceCondition[] = [
  {
    id: "betrunken",
    label: "Betrunken",
    levels: [
      { id: "leicht", label: "Leicht", malus: -2 },
      { id: "mittel", label: "Mittel", malus: -4 },
      { id: "stark", label: "Stark", malus: -6 },
      { id: "sehr_stark", label: "Sehr stark", malus: -8 },
    ],
  },
];

export type ResolvedCondition = { text: string; malus: number };

// „betrunken:stark“ → { text: "Betrunken (stark)", malus: -6 }; unbekannte oder leere Angaben ergeben null.
export function resolveCondition(raw: string | null | undefined): ResolvedCondition | null {
  const [cid, lid] = String(raw ?? "").split(":");
  const condition = DICE_CONDITIONS.find((c) => c.id === cid);
  const level = condition?.levels.find((l) => l.id === lid);
  if (!condition || !level) return null;
  return { text: `${condition.label} (${level.label.toLowerCase()})`, malus: level.malus };
}
