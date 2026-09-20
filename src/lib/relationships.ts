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
