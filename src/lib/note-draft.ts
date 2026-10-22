// Lokaler Entwurf einer Notiz (localStorage): bleibt erhalten, wenn das Speichern ohne Netz scheitert oder die Seite schließt.
export type NoteDraft = { title: string; body: string; tags: string[]; at: number };

const key = (id: string) => `note-draft:${id}`;

export function saveDraft(id: string, draft: Omit<NoteDraft, "at">): void {
  try {
    localStorage.setItem(key(id), JSON.stringify({ ...draft, at: Date.now() } satisfies NoteDraft));
  } catch {
    /* ohne Speicher weiter */
  }
}

export function loadDraft(id: string): NoteDraft | null {
  try {
    const raw = JSON.parse(localStorage.getItem(key(id)) ?? "null") as NoteDraft | null;
    if (raw && typeof raw.title === "string" && typeof raw.body === "string" && Array.isArray(raw.tags) && typeof raw.at === "number") return raw;
  } catch {
    /* unlesbar */
  }
  return null;
}

export function clearDraft(id: string): void {
  try {
    localStorage.removeItem(key(id));
  } catch {
    /* egal */
  }
}

// Gibt es etwas Wiederherstellbares? Der Entwurf muss neuer als der Serverstand sein und sich unterscheiden.
export function draftDiffers(draft: NoteDraft, server: { title: string; body: string; tags: string[]; updatedAt: string }): boolean {
  if (draft.at <= new Date(server.updatedAt).getTime()) return false;
  return draft.title !== server.title || draft.body !== server.body || draft.tags.join() !== server.tags.join();
}
