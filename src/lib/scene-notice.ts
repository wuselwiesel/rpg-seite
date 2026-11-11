// Text und Link der Benachrichtigung „Hinweis an Mitspielende“ (Szene).
export const SCENE_NOTICE_MAX = 200;

// Frei geschriebenen Text bereinigen: Zeilenumbrüche und Mehrfach-Leerzeichen zu einem Leerzeichen, auf die Höchstlänge kürzen.
export function cleanNoticeText(raw: string | undefined | null): string {
  return (raw ?? "").replace(/\s+/g, " ").trim().slice(0, SCENE_NOTICE_MAX);
}

export function sceneNoticeMessage(title: string, text: string): string {
  return `hat dir zu „${title}“ geschrieben: ${text}`;
}

// Führt ans Ende der Szene, als der Charakter der Empfänger:in.
export function sceneNoticeLink(storyPostId: string, recipientCharacterId: string): string {
  return `/story/${storyPostId}?as=${recipientCharacterId}&ziel=ende`;
}
