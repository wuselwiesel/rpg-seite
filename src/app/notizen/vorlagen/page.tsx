import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listNotes, listTemplates } from "@/lib/notes-data";
import { openTasks } from "@/lib/notes";
import { NotesTabs } from "../notes-tabs";
import { TemplatesView } from "./templates-view";

export const metadata = { title: "Vorlagen" };

export default async function TemplatesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [templates, notes] = await Promise.all([listTemplates(supabase, user.id), listNotes(supabase, user.id)]);
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-4 font-serif text-3xl text-fg">Notizen</h1>
      <NotesTabs active="vorlagen" openCount={notes.reduce((sum, n) => sum + openTasks(n.body).length, 0)} />
      <TemplatesView templates={templates} />
    </div>
  );
}
