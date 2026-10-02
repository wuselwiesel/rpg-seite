// Vorlagen für den Steckbrief einer Wiki-Seite: legen die passenden Feldtitel an, der Inhalt bleibt leer.
export const WIKI_TEMPLATES: { id: string; label: string; fields: string[] }[] = [
  { id: "ort", label: "Ort", fields: ["Art des Ortes", "Lage", "Einwohner", "Herrschaft"] },
  { id: "spezies", label: "Spezies", fields: ["Art", "Entstehung", "Lebensdauer", "Schwäche"] },
  { id: "person", label: "Person", fields: ["Alter", "Beruf", "Wohnort", "Familie"] },
  { id: "fraktion", label: "Fraktion", fields: ["Anführer:in", "Sitz", "Mitglieder", "Ziele"] },
  { id: "gegenstand", label: "Gegenstand", fields: ["Art", "Besitzer:in", "Herkunft", "Wirkung"] },
  { id: "ereignis", label: "Ereignis", fields: ["Datum", "Ort", "Beteiligte", "Folgen"] },
];
