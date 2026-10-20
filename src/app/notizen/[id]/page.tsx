import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { backlinks, getNote, listFolders, listTags } from "@/lib/notes-data";
import { getActiveWorld, getUserWorlds } from "@/lib/worlds";
import { getWikiPageRows } from "@/lib/wiki-data";
import { getWorldCharacterTerms } from "@/lib/wiki-characters";
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
  const worldId = note.worldId ?? (await getActiveWorld(user.id))?.id ?? null;
  const [back, pages, characters, folders, allTags, worlds] = await Promise.all([
    backlinks(supabase, user.id, id),
    worldId ? getWikiPageRows(worldId) : Promise.resolve([]),
    worldId ? getWorldCharacterTerms(worldId) : Promise.resolve([]),
    listFolders(supabase, user.id),
    listTags(supabase, user.id),
    getUserWorlds(user.id),
  ]);
  return <NoteEditor key={id} id={id} initialTitle={note.title} initialBody={note.body} initialPinned={note.pinned} initialLinks={note.links} initialTags={note.tags} initialFolderId={note.folderId} initialWorldId={note.worldId} worlds={worlds.map((w) => ({ id: w.id, name: w.name }))} folders={folders} allTags={allTags} backlinks={back} linkPages={pages.map((p) => ({ id: p.id, title: p.title })).sort((a, b) => a.title.localeCompare(b.title, "de"))} linkCharacters={characters.map((c) => ({ id: c.id, name: c.name, avatar_url: c.avatarUrl }))} />;
}
