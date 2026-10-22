// Attrappe der Server-Aktionen: merkt sich die Aufrufe im Fenster
declare global { interface Window { __calls: unknown[] } }
export type WikiTarget = { id: string; title: string; pageType: string | null; isCharacter: boolean };
export async function listWikiTargets(): Promise<WikiTarget[]> {
  return [
    { id: "p1", title: "Lucian Marlowe", pageType: "person", isCharacter: true },
    { id: "p2", title: "Dana Grey", pageType: "person", isCharacter: true },
    { id: "p3", title: "Pinewood", pageType: "ort", isCharacter: false },
  ];
}
export async function appendSceneNote(pageId: string, note: string, sceneId: string, entryId: string | null) {
  (window.__calls ||= []).push({ pageId, note, sceneId, entryId });
  return { ok: true as const };
}
