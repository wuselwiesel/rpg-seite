import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listNotes } from "@/lib/notes-data";
import { NotesList } from "./notes-list";

export const metadata = { title: "Notizen" };

export default async function NotesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <NotesList notes={await listNotes(supabase, user.id)} />;
}
