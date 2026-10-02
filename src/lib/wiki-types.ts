// Seiten-Typen des Wikis (Vorbild: Artikelvorlagen bei World Anvil). Jeder Typ bringt Steckbrief-Felder und eine Gliederung
// für den Text mit; beides ist nur ein Vorschlag und lässt sich ändern.

export const WIKI_TYPE_IDS = ["ort", "spezies", "organisation", "person", "ereignis", "mythos", "gegenstand"] as const;
export type WikiTypeId = (typeof WIKI_TYPE_IDS)[number];

export type WikiTypeIcon = "map-pin" | "paw-print" | "users" | "user" | "calendar-days" | "scroll-text" | "gem";

export type WikiType = {
  id: WikiTypeId;
  label: string;
  plural: string;
  icon: WikiTypeIcon;
  hint: string;
  fields: string[];
  outline: string[];
};

export const WIKI_TYPES: WikiType[] = [
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
  },
];

const BY_ID = new Map<string, WikiType>(WIKI_TYPES.map((t) => [t.id, t]));

export function wikiTypeOf(id: string | null | undefined): WikiType | null {
  return (id && BY_ID.get(id)) || null;
}

// Prüft einen Wert aus dem Formular: gültiger Typ oder null.
export function parseWikiType(raw: FormDataEntryValue | null): WikiTypeId | null {
  return wikiTypeOf(String(raw ?? ""))?.id ?? null;
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
