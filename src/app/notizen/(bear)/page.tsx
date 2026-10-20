import { NotebookPen } from "lucide-react";

export const metadata = { title: "Notizen" };

// Rechte Spalte, solange keine Notiz gewählt ist (nur am großen Bildschirm sichtbar; am Handy zeigt /notizen die Liste)
export default function NotesIndexPage() {
  return (
    <div className="flex h-full min-h-[60dvh] items-center justify-center text-muted">
      <NotebookPen className="h-10 w-10 opacity-30" strokeWidth={1.5} aria-hidden />
    </div>
  );
}
