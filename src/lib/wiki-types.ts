import { folderColorHex } from "@/lib/wiki-folder-style";

// Seitenarten des Wikis (Vorbild: Artikelvorlagen bei World Anvil). Jede Art bringt Steckbrief-Felder und eine Gliederung
// für den Text mit; beides ist nur ein Vorschlag und lässt sich ändern. Die Arten stehen pro Welt in der Tabelle
// `wiki_types` (frei bearbeitbar, eigene möglich); die Liste unten ist der mitgelieferte Grundstock und der Rückfall.

export const STANDARD_TYPE_ICONS = ["map-pin", "paw-print", "users", "user", "calendar-days", "scroll-text", "gem", "file-text"] as const;
export type WikiTypeIcon = (typeof STANDARD_TYPE_ICONS)[number];

export type WikiTypeId = string;

export type WikiType = {
  id: WikiTypeId;
  label: string;
  plural: string;
  // Name eines der Standard-Symbole (siehe WikiTypeIcon) oder ein Emoji bzw. :eigenes:
  icon: string;
  // Schlüssel aus FOLDER_COLORS (lib/wiki-folder-style.ts); ohne Farbe neutral
  color: string | null;
  hint: string;
  fields: string[];
  outline: string[];
  // Bild als Hochformat neben dem Namen statt Querformat
  portrait: boolean;
  // wer die Art angelegt hat (für das Löschrecht); bei den mitgelieferten die Welt-Besitzer:in
  createdBy?: string | null;
};

const BUILTIN_COLOR: Record<string, string> = { ort: "sage", spezies: "peach", organisation: "plum", person: "sky", ereignis: "rose", mythos: "gold", gegenstand: "slate" };

const BUILTIN_RAW: Omit<WikiType, "color" | "portrait">[] = [
  {
    id: "ort",
    label: "Ort",
    plural: "Orte",
    icon: "map-pin",
    hint: "Städte, Landschaften, Gebäude",
    fields: ["Art des Ortes", "Lage", "Einwohner", "Herrschaft", "Gegründet"],
    outline: ["Beschreibung", "Geschichte", "Bewohner", "Sehenswertes", "Gerüchte"],
  },
  {
    id: "spezies",
    label: "Spezies / Wesen",
    plural: "Spezies und Wesen",
    icon: "paw-print",
    hint: "Völker, Rassen, Kreaturen",
    fields: ["Art", "Entstehung", "Lebensdauer", "Fähigkeiten", "Schwäche"],
    outline: ["Aussehen", "Fähigkeiten und Schwächen", "Lebensweise", "Geschichte", "Mythen und Irrtümer"],
  },
  {
    id: "organisation",
    label: "Organisation / Haus",
    plural: "Organisationen und Häuser",
    icon: "users",
    hint: "Fraktionen, Familien, Gruppen",
    fields: ["Anführer:in", "Sitz", "Mitglieder", "Gegründet", "Ziele"],
    outline: ["Überblick", "Geschichte", "Aufbau und Ränge", "Mitglieder", "Ziele und Gegner"],
  },
  {
    id: "person",
    label: "Person",
    plural: "Personen",
    icon: "user",
    hint: "Figuren der Welt, die keine Spielfigur sind",
    fields: ["Alter", "Beruf", "Wohnort", "Familie"],
    outline: ["Wer ist die Person?", "Lebensweg", "Beziehungen", "Geheimnisse"],
  },
  {
    id: "ereignis",
    label: "Ereignis",
    plural: "Ereignisse",
    icon: "calendar-days",
    hint: "Schlachten, Feste, Wendepunkte",
    fields: ["Datum", "Ort", "Beteiligte", "Folgen"],
    outline: ["Was geschah?", "Vorgeschichte", "Ablauf", "Folgen"],
  },
  {
    id: "mythos",
    label: "Mythos",
    plural: "Mythen",
    icon: "scroll-text",
    hint: "Legenden, Religionen, Bräuche",
    fields: ["Herkunft", "Verbreitung", "Wahrheitsgehalt"],
    outline: ["Die Erzählung", "Ursprung", "Deutungen", "Was wirklich dahintersteckt"],
  },
  {
    id: "gegenstand",
    label: "Gegenstand",
    plural: "Gegenstände",
    icon: "gem",
    hint: "Waffen, Artefakte, Besonderes",
    fields: ["Art", "Besitzer:in", "Herkunft", "Wirkung"],
    outline: ["Beschreibung", "Geschichte", "Kräfte und Preis", "Aufenthaltsort"],
  }
];

export const BUILTIN_WIKI_TYPES: WikiType[] = BUILTIN_RAW.map((t) => ({ ...t, color: BUILTIN_COLOR[t.id] ?? null, portrait: t.id === "person" }));

// Rückfall für Stellen ohne Weltdaten.
export const WIKI_TYPES = BUILTIN_WIKI_TYPES;
export const WIKI_TYPE_IDS = BUILTIN_WIKI_TYPES.map((t) => t.id);

export function wikiTypeOf(id: string | null | undefined, types: WikiType[] = BUILTIN_WIKI_TYPES): WikiType | null {
  return (id && types.find((t) => t.id === id)) || null;
}

// Prüft einen Wert aus dem Formular: gültige Art der Welt oder null.
export function parseWikiType(raw: FormDataEntryValue | null, types: WikiType[] = BUILTIN_WIKI_TYPES): WikiTypeId | null {
  return wikiTypeOf(String(raw ?? ""), types)?.id ?? null;
}

// Gliederung als HTML für den Editor: Überschriften mit leerem Absatz darunter.
export function outlineHtml(type: WikiType): string {
  return type.outline.map((h) => `<h2>${h}</h2><p></p>`).join("");
}

// Zeilen für den Steckbrief; bestehende Zeilen mit Inhalt bleiben erhalten, fehlende Titel kommen unten dazu.
export function mergeFields(
  existing: { icon: string; title: string; text: string }[],
  type: WikiType,
): { icon: string; title: string; text: string }[] {
  const filled = existing.filter((f) => f.title.trim() || f.text.trim());
  const have = new Set(filled.map((f) => f.title.trim().toLowerCase()));
  const added = type.fields.filter((t) => !have.has(t.toLowerCase())).map((title) => ({ icon: "", title, text: "" }));
  return [...filled, ...added];
}

// Farbe einer Art im Wiki-Graph; ohne Art oder Farbe neutral. Feste Töne, damit Arten auf allen Themen unterscheidbar bleiben.
export function wikiTypeColor(id: string | null | undefined, types: WikiType[] = BUILTIN_WIKI_TYPES): string {
  const t = wikiTypeOf(id, types);
  return (t && folderColorHex(t.color)) || "var(--muted)";
}

// Arten, bei denen das Bild ein normales Hochformat-Bild (wie ein Charakterbild) neben dem Namen ist statt eines Querformat-Bilds.
export function usesPortraitImage(type: string | null | undefined, types: WikiType[] = BUILTIN_WIKI_TYPES): boolean {
  return Boolean(wikiTypeOf(type, types)?.portrait);
}

// Eine Kennung für eine neue Art aus dem Namen ("Magie & Zauber" -> "magie_zauber"), frei von Doppelungen.
export function newTypeId(label: string, taken: Set<string>): string {
  const base =
    label
      .toLowerCase()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 30) || "art";
  let id = base;
  for (let i = 2; taken.has(id); i++) id = `${base}_${i}`;
  return id;
}
