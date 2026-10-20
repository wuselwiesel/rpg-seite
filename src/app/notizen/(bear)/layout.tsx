import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listFolders, listNotes } from "@/lib/notes-data";
import { openTasks } from "@/lib/notes";
import { getActiveWorld, getUserWorlds } from "@/lib/worlds";
import { NotesList } from "../notes-list";
import { NotesShell } from "../notes-shell";

// Liste links, Notiz rechts: die Liste bleibt beim Wechsel zwischen Notizen stehen (Filter, Ordner, Suche bleiben).
export default async function NotesLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [notes, folders, worlds, active] = await Promise.all([listNotes(supabase, user.id), listFolders(supabase, user.id), getUserWorlds(user.id), getActiveWorld(user.id)]);
  return (
    <NotesShell
      list={<NotesList pane notes={notes} folders={folders} openCount={notes.reduce((sum, n) => sum + openTasks(n.body).length, 0)} worlds={worlds.map((w) => ({ id: w.id, name: w.name }))} activeWorldId={active?.id ?? null} />}
    >
      {children}
    </NotesShell>
  );
}
