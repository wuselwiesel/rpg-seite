import type { FamilyRole, RelationshipCategory } from "@/lib/types";

export const REL_CATEGORIES: { id: RelationshipCategory; label: string; color: string; suggestions: string[] }[] = [
  { id: "familie", label: "Familie", color: "#b07a4a", suggestions: ["Geschwister", "Eltern und Kind", "Ehepaar", "Cousins", "Verwandt"] },
  { id: "liebe", label: "Liebe", color: "#d0587e", suggestions: ["Liiert", "Verliebt", "Verlobt", "Heimliche Liebe", "Ex-Partner:innen"] },
  { id: "freundschaft", label: "Freundschaft", color: "#5b9d6f", suggestions: ["Befreundet", "Beste Freund:innen", "Vertraut", "Bekannt"] },
  { id: "buendnis", label: "Bündnis", color: "#4f7fb5", suggestions: ["Verbündet", "Zweckbündnis", "Mentor:in", "Kolleg:innen"] },
  { id: "rivalitaet", label: "Rivalität", color: "#c4553f", suggestions: ["Rivalen", "Verfeindet", "Erzfeinde", "Misstrauisch"] },
  { id: "sonstiges", label: "Sonstiges", color: "#9a9a9a", suggestions: ["Verbunden", "Es ist kompliziert"] },
];

export const FAMILY_ROLES: { id: FamilyRole; label: string }[] = [
  { id: "eltern", label: "A ist Elternteil von B" },
  { id: "partner", label: "A und B sind ein Paar / verheiratet" },
  { id: "geschwister", label: "A und B sind Geschwister" },
  { id: "verwandt", label: "Sonstige Verwandtschaft" },
];

export function categoryInfo(id: string) {
  return REL_CATEGORIES.find((c) => c.id === id) ?? REL_CATEGORIES[REL_CATEGORIES.length - 1];
}

// Aus der Bezeichnung einer ChaBo-Zeile („Mutter“, „Beste Freundin“ …) die passende Beziehungsart im Beziehungsnetz erraten.
// `targetIsParent`: bei Eltern-Beziehungen (A ist Elternteil von B) ist die erwähnte Figur der Elternteil.
export type RelationGuess = { category: RelationshipCategory; familyRole: FamilyRole | null; targetIsParent: boolean; color: string };

export function guessRelation(label: string): RelationGuess {
  const l = label.toLowerCase().replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
  const has = (re: RegExp) => re.test(l);
  const out = (category: RelationshipCategory, familyRole: FamilyRole | null = null, targetIsParent = false): RelationGuess => ({
    category,
    familyRole,
    targetIsParent,
    color: categoryInfo(category).color,
  });
  if (has(/\bex\b|\bex-/)) return out("liebe");
  if (has(/\b(mutter|vater|mama|papa|mum|mom|dad|eltern|elternteil|stiefmutter|stiefvater|adoptivmutter|adoptivvater)\b/)) return out("familie", "eltern", true);
  if (has(/\b(kind|sohn|tochter|stiefsohn|stieftochter|adoptivsohn|adoptivtochter)\b/)) return out("familie", "eltern", false);
  if (has(/\b(bruder|schwester|geschwister|zwilling|halbbruder|halbschwester|stiefbruder|stiefschwester)\b/)) return out("familie", "geschwister");
  if (has(/\b(ehemann|ehefrau|ehepartner|gatte|gattin|verlobter|verlobte)\b/)) return out("familie", "partner");
  if (has(/\b(onkel|tante|cousin|cousine|oma|opa|großmutter|großvater|grossmutter|grossvater|neffe|nichte|verwandt|verwandte|verwandter)\b/)) return out("familie", "verwandt");
  if (has(/rival|feind|gegner|hass|erzfeind/)) return out("rivalitaet");
  if (has(/partner|liiert|verliebt|affäre|affaere|lover|liebe|crush|schwarm/)) return out("liebe");
  if (has(/freund|vertraut|kumpel|bff/)) return out("freundschaft");
  if (has(/verbünd|verbuend|bündnis|buendnis|allianz|mentor|kolleg|verbündete/)) return out("buendnis");
  return out("sonstiges");
}
