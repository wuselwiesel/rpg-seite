"use server";

import { createClient } from "@/lib/supabase/server";
import { backlinks, getNote, listFolders, listNotes, listTags, listTemplates, purgeOldTrash } from "@/lib/notes-data";
import { openTasks, type NoteFolder, type NoteLinkView, type NoteView } from "@/lib/notes";
import { getActiveWorld, getUserWorlds } from "@/lib/worlds";
import { getWikiPageRows } from "@/lib/wiki-data";
import { getWorldCharacterTerms } from "@/lib/wiki-characters";

export type NotebookData = {
  notes: NoteView[];
  folders: NoteFolder[];
  templates: NoteView[];
  worlds: { id: string; name: string }[];
  activeWorldId: string | null;
  openCount: number;
};

// Alles, was das Notizbuch-Fenster zum Öffnen braucht (Liste, Ordner, Vorlagen, Welten)
export async function loadNotebook(): Promise<NotebookData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  await purgeOldTrash(supabase, user.id);
  const [notes, folders, templates, worlds, active] = await Promise.all([listNotes(supabase, user.id, true), listFolders(supabase, user.id), listTemplates(supabase, user.id), getUserWorlds(user.id), getActiveWorld(user.id)]);
  return {
    notes,
    folders,
    templates,
    worlds: worlds.map((w) => ({ id: w.id, name: w.name })),
    activeWorldId: active?.id ?? null,
    openCount: notes.filter((n) => !n.deletedAt && !n.archived).reduce((sum, n) => sum + openTasks(n.body).length, 0),
  };
}

export type NoteBundle = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  links: NoteLinkView[];
  tags: string[];
  folderId: string | null;
  worldId: string | null;
  isTemplate: boolean;
  archived: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  worlds: { id: string; name: string }[];
  folders: NoteFolder[];
  allTags: string[];
  backlinks: { id: string; title: string }[];
  linkPages: { id: string; title: string }[];
  linkCharacters: { id: string; name: string; avatar_url: string | null }[];
};

// Eine Notiz mit allem, was der Editor daneben braucht (Rückverweise, Wiki-Seiten und Figuren der Welt der Notiz)
export async function loadNoteBundle(id: string): Promise<NoteBundle | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const note = await getNote(supabase, user.id, id);
  if (!note) return null;
  const worldId = note.worldId ?? (await getActiveWorld(user.id))?.id ?? null;
  const [back, pages, characters, folders, allTags, worlds] = await Promise.all([
    backlinks(supabase, user.id, id),
    worldId ? getWikiPageRows(worldId) : Promise.resolve([]),
    worldId ? getWorldCharacterTerms(worldId) : Promise.resolve([]),
    listFolders(supabase, user.id),
    listTags(supabase, user.id),
    getUserWorlds(user.id),
  ]);
  return {
    id: note.id,
    title: note.title,
    body: note.body,
    pinned: note.pinned,
    links: note.links,
    tags: note.tags,
    folderId: note.folderId,
    worldId: note.worldId,
    isTemplate: note.isTemplate,
    archived: note.archived,
    deletedAt: note.deletedAt,
    createdAt: note.createdAt ?? note.updatedAt,
    updatedAt: note.updatedAt,
    worlds: worlds.map((w) => ({ id: w.id, name: w.name })),
    folders,
    allTags,
    backlinks: back,
    linkPages: pages.map((p) => ({ id: p.id, title: p.title })).sort((a, b) => a.title.localeCompare(b.title, "de")),
    linkCharacters: characters.map((c) => ({ id: c.id, name: c.name, avatar_url: c.avatarUrl })),
  };
}
