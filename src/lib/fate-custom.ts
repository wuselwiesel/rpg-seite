import { FATE_CATEGORIES, SEVERITY_ORDER, type Fate, type FateCategory, type FateSeverity } from "@/lib/fate-types";

// Eigene Schicksale einer Welt (Tabelle world_custom_fates): Eingabe prüfen und in ein Schicksal für die Würfel-Engine umwandeln.

export const CUSTOM_FATE_MIN = 5;
export const CUSTOM_FATE_MAX = 500;
export const MAX_CUSTOM_FATES_PER_WORLD = 300;

export type CustomFateRow = {
  id: string;
  category: string;
  severity: string;
  text: string;
  targets: number;
  created_by: string;
};

export function isFateCategory(v: unknown): v is FateCategory {
  return typeof v === "string" && (FATE_CATEGORIES as string[]).includes(v);
}

export function isFateSeverity(v: unknown): v is FateSeverity {
  return typeof v === "string" && (SEVERITY_ORDER as string[]).includes(v);
}

// Prüft den Text: nur {character1} bis {character3}, {character1} muss vorkommen, die Zusatz-Charaktere lückenlos (2 vor 3).
// Die Zahl der Zusatz-Charaktere (targets) ergibt sich aus dem höchsten Platzhalter.
export function analyzeFateText(raw: string): { error: string } | { text: string; targets: 0 | 1 | 2 } {
  const text = raw.replace(/\s+/g, " ").trim();
  if (text.length < CUSTOM_FATE_MIN) return { error: "Der Text ist zu kurz." };
  if (text.length > CUSTOM_FATE_MAX) return { error: `Der Text darf höchstens ${CUSTOM_FATE_MAX} Zeichen lang sein.` };
  const stripped = text.replace(/\{character([123])\}/g, "");
  if (/[{}]/.test(stripped)) return { error: "Erlaubt sind nur die Platzhalter {character1}, {character2} und {character3}." };
  const used = new Set(Array.from(text.matchAll(/\{character([123])\}/g), (m) => Number(m[1])));
  if (!used.has(1)) return { error: "Der Text braucht {character1} (den betroffenen Charakter)." };
  if (used.has(3) && !used.has(2)) return { error: "{character3} geht nur zusammen mit {character2}." };
  const targets = used.has(3) ? 2 : used.has(2) ? 1 : 0;
  return { text, targets };
}

export function rowToFate(row: CustomFateRow): Fate | null {
  if (!isFateCategory(row.category) || !isFateSeverity(row.severity)) return null;
  const targets = row.targets === 2 ? 2 : row.targets === 1 ? 1 : 0;
  return {
    id: row.id,
    category: row.category,
    severity: row.severity,
    minTargets: targets,
    maxTargets: targets,
    text: row.text,
    roles: targets === 0 ? undefined : Array.from({ length: targets }, () => ({})),
    tags: [],
  };
}

export function rowsToFates(rows: CustomFateRow[]): Fate[] {
  return rows.map(rowToFate).filter((f): f is Fate => !!f);
}

// Beispieltext mit Beispielnamen (für die Vorschau)
export function previewFateText(text: string): string {
  return text.split("{character1}").join("Mira").split("{character2}").join("Jonas").split("{character3}").join("Lena");
}
