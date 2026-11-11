// Text und Link der Benachrichtigung „Hinweis an Mitspielende“ (Szene).
export const SCENE_NOTICE_MAX = 200;

// Frei geschriebenen Text bereinigen: Zeilenumbrüche und Mehrfach-Leerzeichen zu einem Leerzeichen, auf die Höchstlänge kürzen.
export function cleanNoticeText(raw: string | undefined | null): string {
  return (raw ?? "").replace(/\s+/g, " ").trim().slice(0, SCENE_NOTICE_MAX);
}

// Mit entryId: „hat … einen Beitrag bearbeitet“ (optional mit Zusatztext); ohne: der eigene Text.
export function sceneNoticeMessage(title: string, text: string, entryId: string | null): string {
  return entryId ? `hat in „${title}“ einen Beitrag bearbeitet${text ? `: ${text}` : ""}` : `hat dir zu „${title}“ geschrieben: ${text}`;
}

// Bei einem bearbeiteten Beitrag springt der Link dorthin (ohne ?as=, das den Hash verlieren könnte); sonst ans Ende der Szene als der Charakter.
export function sceneNoticeLink(storyPostId: string, entryId: string | null, recipientCharacterId: string): string {
  return entryId ? `/story/${storyPostId}#beitrag-${entryId}` : `/story/${storyPostId}?as=${recipientCharacterId}&ziel=ende`;
}
