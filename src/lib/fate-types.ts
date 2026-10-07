// Datenstruktur für den Schicksalswürfel – bewusst getrennt von Engine (fate-engine.ts)
// und Daten (fate-data.ts), damit neue Schicksale sich problemlos ergänzen lassen.
import type { CharacterGender, CharacterSpecies } from "@/lib/types";

export type FateCategory =
  | "Beziehung"
  | "Familie"
  | "Gefahr"
  | "Kriminalität"
  | "Vergangenheit"
  | "Vampir"
  | "Werwolf";

export const FATE_CATEGORIES: FateCategory[] = [
  "Beziehung",
  "Familie",
  "Gefahr",
  "Kriminalität",
  "Vergangenheit",
  "Vampir",
  "Werwolf",
];

export type FateSeverity = "leicht" | "mittel" | "schwer" | "sehr schwer" | "extrem";

// Reihenfolge von harmlos zu extrem – bestimmt Sortierung und Range-Filter.
export const SEVERITY_ORDER: FateSeverity[] = ["leicht", "mittel", "schwer", "sehr schwer", "extrem"];

// Anforderung an eine Rolle (character1 oder einen der Zusatz-Charaktere).
export type FateRoleRequirement = {
  gender?: CharacterGender;
  species?: CharacterSpecies[];
  // Nur für Zusatz-Charaktere: muss die echte Partnerin/der echte beste Freund von character1 sein
  // (aus dessen Profil) - macht z.B. "wird betrogen" logisch statt zufällig.
  relation?: "partner" | "bestFriend";
};

export type Fate = {
  // Zahl bei den eingebauten, UUID bei den eigenen Schicksalen einer Welt
  id: number | string;
  category: FateCategory;
  severity: FateSeverity;
  // Anzahl zusätzlicher, benannter Charaktere (character2, character3, ...).
  minTargets: 0 | 1 | 2;
  maxTargets: 0 | 1 | 2;
  // Anforderungen je Zusatz-Charakter, Index 0 = character2, Index 1 = character3.
  roles?: FateRoleRequirement[];
  char1?: FateRoleRequirement;
  // Text mit {character1}/{character2}/{character3}-Platzhaltern, verwendet wenn maxTargets erreicht wurde.
  text: string;
  // Fallback-Text ohne Zusatz-Charaktere (nur wenn minTargets === 0 und maxTargets >= 1).
  soloText?: string;
  // Kurze Themen-Stichpunkte (z.B. "Manipulation", "Vampire") - rein informativ, nie Pflicht.
  tags?: string[];
};

export type GenderFilter = "alle" | CharacterGender;
// "alle" = jede erreichbare Person, sonst die konkrete Nutzer-ID einer bestimmten
// Person (der eigene Account oder eine Freundin/ein Freund), deren Charaktere gemeint sind.
export type OwnerFilter = "alle" | string;

export type CharacterMeta = {
  id: string;
  name: string;
  gender: CharacterGender | null;
  species: CharacterSpecies;
  ownerId: string;
  worldId: string;
  partnerId: string | null;
  bestFriendId: string | null;
};

export type Char1Config =
  | { mode: "specific"; characterId: string }
  | { mode: "pool"; gender: GenderFilter; ownerId: OwnerFilter };

// Jeder Zusatz-Charakter hat eine eigene Welt (Standard: die aktive Welt), aus der
// seine Charaktere/Person stammen - eine Freundin kann in mehreren Welten sein.
export type SlotConfig = { worldId: string; gender: GenderFilter; ownerId: OwnerFilter };

// Optionaler Schweregrad-Bereich (inklusiv). Standard: die volle Bandbreite, also keine Einschränkung.
export type SeverityRange = { min: FateSeverity; max: FateSeverity };

export type FateRollResult = {
  fate: Fate;
  char1: CharacterMeta;
  targets: CharacterMeta[];
  text: string;
};
