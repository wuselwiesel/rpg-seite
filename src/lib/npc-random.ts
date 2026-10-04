// „Komplett würfeln“ für NPCs: Name, Wesen, Alter, Werte und Felder in einem Zug. Rein (Zufallsquelle als Parameter).
import { rollAllFields, raceOfSheet, type CustomPools } from "@/lib/random-pools";
import { rollAttributes, rollTalents, type Rng } from "@/lib/sheet-random";
import { emptySheet, withDerived, type Race, type SheetData } from "@/lib/sheet-rules";

export type NpcRollOptions = { rng: Rng; custom?: Partial<CustomPools>; avoid?: ReadonlySet<string> };

export function rollNpcSheet({ rng, custom, avoid }: NpcRollOptions): SheetData {
  let d = emptySheet();
  d = rollAllFields(d, custom, rng, avoid);
  d = rollAttributes(d, rng() < 0.7 ? "ausgewogen" : "wild", rng);
  d = rollTalents(d, rng() < 0.5 ? "allrounder" : "spezialist", rng);
  return withDerived(d);
}

const valueOf = (d: SheetData, label: string) => d.personalFields.find((f) => f.label === label)?.value.trim() ?? "";

// „Vorname Nachname“ aus den gewürfelten Feldern
export function npcName(d: SheetData): string {
  return [valueOf(d, "Vorname"), valueOf(d, "Nachname")].filter(Boolean).join(" ").trim();
}

// Für das Wesen-Feld des Profils (Filter des Schicksalswürfels): Mensch, Vampir oder Werwolf
export function speciesOfSheet(d: SheetData): "mensch" | "vampir" | "werwolf" {
  const race: Race = raceOfSheet(d);
  return race === "vampir" ? "vampir" : race === "werwolf" ? "werwolf" : "mensch";
}

// Kurzbeschreibung fürs Profil aus Alter, Beruf und Eigenheit
export function npcBio(d: SheetData): string {
  const alter = valueOf(d, "Alter");
  const parts = [alter ? `${alter} Jahre` : "", valueOf(d, "Beruf / Schule / AG"), valueOf(d, "Eigenheiten")].filter(Boolean);
  return parts.join(". ").slice(0, 300);
}
