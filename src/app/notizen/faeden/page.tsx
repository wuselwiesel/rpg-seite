import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listNotes } from "@/lib/notes-data";
import { noteTitle, openTasks } from "@/lib/notes";
import { NotesTabs } from "../notes-tabs";
import { OpenTasks, type TaskGroup } from "./open-tasks";

export const metadata = { title: "Offene Fäden" };

export default async function OpenThreadsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const notes = await listNotes(supabase, user.id);
  const groups: TaskGroup[] = notes
    .map((n) => ({ noteId: n.id, title: noteTitle(n), links: n.links, tasks: openTasks(n.body).map((t) => ({ index: t.index, text: t.text })) }))
    .filter((g) => g.tasks.length > 0);
  const count = groups.reduce((sum, g) => sum + g.tasks.length, 0);
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-4 font-serif text-3xl text-fg">Notizen</h1>
      <NotesTabs active="faeden" openCount={count} />
      <OpenTasks groups={groups} />
    </div>
  );
}
