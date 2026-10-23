import { NotebookRoute } from "@/components/notebook-host";

export const metadata = { title: "Notizen" };

// Die Adresse /notizen öffnet das Notizbuch-Fenster über der Startseite
export default function NotesPage() {
  return <NotebookRoute />;
}
