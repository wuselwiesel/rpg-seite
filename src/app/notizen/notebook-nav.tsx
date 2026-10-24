"use client";

import { createContext, useContext } from "react";

// Welche Seite des Notizbuchs links steht: die Liste, die offenen Fäden oder die Vorlagen
export type NotebookView = "notes" | "templates";

// Was das Notizbuch öffnen soll (aus dem Menü, einem Notiz-Link oder einer Notiz-Adresse)
// view null: Ansicht beibehalten
export type NotebookRequest = { seq: number; noteId: string | null; view: NotebookView | null };

// Steuerung innerhalb des geöffneten Buchs: gewählte Notiz, Ansicht, Neuladen, Schließen
export type NotebookNav = {
  activeId: string | null;
  openNote: (id: string | null) => void;
  closeNote: () => void;
  view: NotebookView;
  setView: (v: NotebookView) => void;
  reload: () => void;
  // Die offene Notiz neu vom Server holen (wenn sie anderswo geändert wurde, etwa durch Abhaken in „Offene Fäden“)
  refreshNote: () => void;
  close: () => void;
};

export const NotebookNavContext = createContext<NotebookNav | null>(null);

export function useNotebookNav(): NotebookNav {
  const v = useContext(NotebookNavContext);
  if (!v) throw new Error("Notizbuch fehlt");
  return v;
}
