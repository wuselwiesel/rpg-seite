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

export type FateSeverity = "mittel" | "schwer" | "sehr schwer";

// Anforderung an eine Rolle (character1 oder einen der Zusatz-Charaktere).
export type FateRoleRequirement = {
  gender?: CharacterGender;
  species?: CharacterSpecies[];
};

export type Fate = {
  id: number;
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
};

export type GenderFilter = "alle" | CharacterGender;
export type SpeciesFilter = "alle" | CharacterSpecies;

export type CharacterMeta = {
  id: string;
  name: string;
  gender: CharacterGender | null;
  species: CharacterSpecies;
};

export type Char1Config =
  | { mode: "specific"; characterId: string }
  | { mode: "pool"; gender: GenderFilter; species: SpeciesFilter };

export type SlotConfig = { gender: GenderFilter; species: SpeciesFilter };

export type FateRollResult = {
  fate: Fate;
  char1: CharacterMeta;
  targets: CharacterMeta[];
  text: string;
};
