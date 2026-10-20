import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { backlinks, getNote } from "@/lib/notes-data";
import { NoteEditor } from "./note-editor";

export const metadata = { title: "Notiz" };

export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const note = await getNote(supabase, user.id, id);
  if (!note) notFound();
  const back = await backlinks(supabase, user.id, id);
  return <NoteEditor key={id} id={id} initialTitle={note.title} initialBody={note.body} initialPinned={note.pinned} initialLinks={note.links} backlinks={back} />;
}
