// Kapitel innerhalb einer Szene: Kapitel 1 ist der Szenenanfang, die Kapitel-Marken (story_entries.kind = 'chapter') zählen ab Kapitel 2.
// Anker sind stabil (Marken-ID statt laufender Nummer), damit sich Links nicht verschieben, wenn ein Kapitel eingefügt wird.

export const CHAPTER_ONE_ANCHOR = "kapitel-anfang";
export const CHAPTER_ONE_DEFAULT_TITLE = "Anfang";

// Anzeige-Nummer einer Marke aus ihrer Stelle unter den Marken (0 = erste Marke = Kapitel 2)
export function chapterNumber(markIndex: number): number {
  return markIndex + 2;
}

export function chapterAnchor(entryId: string): string {
  return `kapitel-${entryId}`;
}

// „Teil II“ (eigene Bezeichnung) oder „Kapitel 3“
export function chapterLabelText(label: string | null | undefined, number: number): string {
  return label?.trim() || `Kapitel ${number}`;
}

export type ChapterOne = { title: string | null; label: string | null };

export function chapterOneTitle(one: ChapterOne): string {
  return one.title?.trim() || CHAPTER_ONE_DEFAULT_TITLE;
}
