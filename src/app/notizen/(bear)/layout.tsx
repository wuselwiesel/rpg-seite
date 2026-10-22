import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listFolders, listNotes, purgeOldTrash } from "@/lib/notes-data";
import { openTasks } from "@/lib/notes";
import { getActiveWorld, getUserWorlds } from "@/lib/worlds";
import { NotesShell } from "../notes-shell";

// Liste links, Notiz rechts: die Liste bleibt beim Wechsel zwischen Notizen stehen (Filter, Ordner, Suche bleiben).
export default async function NotesLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await purgeOldTrash(supabase, user.id);
  const [notes, folders, worlds, active] = await Promise.all([listNotes(supabase, user.id, true), listFolders(supabase, user.id), getUserWorlds(user.id), getActiveWorld(user.id)]);
  return (
    <NotesShell
      notes={notes}
      folders={folders}
      worlds={worlds.map((w) => ({ id: w.id, name: w.name }))}
      activeWorldId={active?.id ?? null}
      openCount={notes.filter((n) => !n.deletedAt && !n.archived).reduce((sum, n) => sum + openTasks(n.body).length, 0)}
    >
      {children}
    </NotesShell>
  );
}
