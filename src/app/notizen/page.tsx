import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listFolders, listNotes } from "@/lib/notes-data";
import { openTasks } from "@/lib/notes";
import { NotesList } from "./notes-list";

export const metadata = { title: "Notizen" };

export default async function NotesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [notes, folders] = await Promise.all([listNotes(supabase, user.id), listFolders(supabase, user.id)]);
  return <NotesList notes={notes} folders={folders} openCount={notes.reduce((sum, n) => sum + openTasks(n.body).length, 0)} />;
}
