import type { NoteLinkView, NoteView } from "@/lib/notes";

// Der Editor meldet Änderungen an der Liste daneben (Zwei-Spalten-Ansicht), ohne dass der Server neu laden muss.
export type NotePatch = { id: string } & Partial<Pick<NoteView, "title" | "body" | "tags" | "pinned" | "archived" | "deletedAt" | "folderId" | "worldId">> & { links?: NoteLinkView[] };

export const NOTE_PATCH_EVENT = "note-patch";

export function emitNotePatch(patch: NotePatch) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent<NotePatch>(NOTE_PATCH_EVENT, { detail: patch }));
}
