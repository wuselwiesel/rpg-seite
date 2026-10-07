import { FATE_CATEGORIES, SEVERITY_ORDER, type Fate, type FateCategory, type FateRoleRequirement, type FateSeverity } from "@/lib/fate-types";
import type { CharacterGender, CharacterSpecies } from "@/lib/types";

// Eigene Schicksale einer Welt (Tabelle world_custom_fates): Eingabe prüfen und in ein Schicksal für die Würfel-Engine umwandeln.

export const CUSTOM_FATE_MIN = 5;
export const CUSTOM_FATE_MAX = 500;
export const MAX_CUSTOM_FATES_PER_WORLD = 300;

// Bedingungen je Rolle: Schlüssel "1" = Charakter 1, "2" = {character2}, "3" = {character3}
export type CustomRoles = Partial<Record<"1" | "2" | "3", FateRoleRequirement>>;

export const GENDER_CHOICES: { id: CharacterGender; label: string }[] = [
  { id: "weiblich", label: "weiblich" },
  { id: "maennlich", label: "männlich" },
  { id: "divers", label: "divers" },
];
export const SPECIES_CHOICES: { id: CharacterSpecies; label: string }[] = [
  { id: "mensch", label: "Mensch" },
  { id: "vampir", label: "Vampir" },
  { id: "werwolf", label: "Werwolf" },
];
export const RELATION_CHOICES: { id: "partner" | "bestFriend"; label: string }[] = [
  { id: "partner", label: "Partner:in von Charakter 1" },
  { id: "bestFriend", label: "Beste:r Freund:in von Charakter 1" },
];

export type CustomFateRow = {
  id: string;
  category: string;
  severity: string;
  text: string;
  targets: number;
  created_by: string;
  roles?: unknown;
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

// Bedingungen bereinigen: nur Rollen, die der Text benutzt (Charakter 1 plus `targets` weitere), nur bekannte Werte; leere Rollen entfallen.
export function cleanRoles(raw: unknown, targets: number): CustomRoles {
  const out: CustomRoles = {};
  if (!raw || typeof raw !== "object") return out;
  for (const key of ["1", "2", "3"] as const) {
    if (Number(key) > targets + 1) continue;
    const r = (raw as Record<string, unknown>)[key];
    if (!r || typeof r !== "object") continue;
    const { gender, species, relation } = r as { gender?: unknown; species?: unknown; relation?: unknown };
    const role: FateRoleRequirement = {};
    if (GENDER_CHOICES.some((g) => g.id === gender)) role.gender = gender as CharacterGender;
    if (Array.isArray(species)) {
      const list = Array.from(new Set(species.filter((x): x is CharacterSpecies => SPECIES_CHOICES.some((sp) => sp.id === x))));
      // Alle drei Wesen angekreuzt heißt: egal
      if (list.length > 0 && list.length < SPECIES_CHOICES.length) role.species = list;
    }
    if (key !== "1" && RELATION_CHOICES.some((x) => x.id === relation)) role.relation = relation as "partner" | "bestFriend";
    if (Object.keys(role).length) out[key] = role;
  }
  return out;
}

// Kurze Beschreibung der Bedingungen einer Rolle, z. B. „weiblich, Vampir“
export function describeRole(role: FateRoleRequirement | undefined): string {
  if (!role) return "";
  const parts: string[] = [];
  if (role.relation) parts.push(RELATION_CHOICES.find((r) => r.id === role.relation)?.label ?? "");
  if (role.gender) parts.push(GENDER_CHOICES.find((g) => g.id === role.gender)?.label ?? "");
  if (role.species?.length) parts.push(role.species.map((sp) => SPECIES_CHOICES.find((c) => c.id === sp)?.label ?? sp).join(" oder "));
  return parts.filter(Boolean).join(", ");
}

export function rowToFate(row: CustomFateRow): Fate | null {
  if (!isFateCategory(row.category) || !isFateSeverity(row.severity)) return null;
  const targets = row.targets === 2 ? 2 : row.targets === 1 ? 1 : 0;
  const cleaned = cleanRoles(row.roles, targets);
  return {
    id: row.id,
    category: row.category,
    severity: row.severity,
    minTargets: targets,
    maxTargets: targets,
    text: row.text,
    roles: targets === 0 ? undefined : Array.from({ length: targets }, (_, i) => cleaned[String(i + 2) as "2" | "3"] ?? {}),
    char1: cleaned["1"],
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
