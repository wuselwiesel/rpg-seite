"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { confirmDialog } from "@/components/confirm-dialog";
import { archiveNote, createNoteFolder, deleteNote, deleteNoteFolder, emptyTrash, moveNoteFolder, renameNoteFolder, restoreNote, trashNote } from "./actions";
import { NOTE_PATCH_EVENT, type NotePatch } from "@/lib/note-events";
import { descendantIds, noteMatches, noteTitle, tagMatches, type NoteFolder, type NoteView } from "@/lib/notes";

// Gemeinsamer Zustand von Seitenleiste und Liste: Notizen, Ordner, gewählte Ansicht, Tag, Welt, Sortierung, Auswahl.
// „all“, „recent“ (zuletzt geändert), „untagged“ (ohne Tag), „none“ (ohne Ordner), „archive“, „trash“, sonst die ID eines Ordners.
export type Scope = "all" | "recent" | "untagged" | "none" | "archive" | "trash" | string;
export type SortKey = "updated" | "created" | "title";
export type Sort = { key: SortKey; dir: "asc" | "desc" };

const SORT_STORAGE = "notes-sort";
const RECENT_DAYS = 7;

type Store = {
  notes: NoteView[];
  folders: NoteFolder[];
  worlds: { id: string; name: string }[];
  openCount: number;
  scope: Scope;
  setScope: (s: Scope) => void;
  tag: string | null;
  setTag: (t: string | null) => void;
  world: string;
  sort: Sort;
  setSort: (s: Sort) => void;
  q: string;
  setQ: (q: string) => void;
  error: string | null;
  setError: (e: string | null) => void;
  // abgeleitet
  live: NoteView[];
  archived: NoteView[];
  trashed: NoteView[];
  recentCount: number;
  untaggedCount: number;
  folderCount: Map<string, number>;
  tagCounts: [string, number][];
  shown: NoteView[];
  exportQuery: string;
  // Auswahl
  selecting: boolean;
  setSelecting: (v: boolean) => void;
  selected: Set<string>;
  setSelected: (s: Set<string>) => void;
  // Änderungen (Server + Anzeige)
  patchNote: (id: string, patch: Partial<NoteView>) => void;
  removeNotes: (ids: string[]) => void;
  trash: (n: NoteView) => Promise<void>;
  restore: (n: NoteView) => Promise<void>;
  toggleArchive: (n: NoteView) => Promise<void>;
  deleteForever: (n: NoteView) => Promise<void>;
  clearTrash: () => Promise<void>;
  createFolder: (name: string, parentId: string | null) => Promise<NoteFolder | null>;
  renameFolder: (id: string, name: string, parentId: string | null) => Promise<boolean>;
  removeFolder: (f: NoteFolder) => Promise<void>;
  undo: { id: string; title: string } | null;
  dismissUndo: () => void;
};

const Ctx = createContext<Store | null>(null);

export function useNotesStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error("NotesProvider fehlt");
  return v;
}

export function compareNotes(sort: Sort): (a: NoteView, b: NoteView) => number {
  const dir = sort.dir === "asc" ? 1 : -1;
  return (a, b) => {
    // Angeheftete stehen immer oben
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (sort.key === "title") return dir * noteTitle(a).localeCompare(noteTitle(b), "de");
    // „erstellt“ kennen wir erst nach dem Nachladen; bis dahin gilt die Änderungszeit
    const ka = sort.key === "created" ? (a.createdAt ?? a.updatedAt) : a.updatedAt;
    const kb = sort.key === "created" ? (b.createdAt ?? b.updatedAt) : b.updatedAt;
    return dir * ka.localeCompare(kb);
  };
}

export function NotesProvider({
  notes: initialNotes,
  folders: initialFolders,
  worlds,
  activeWorldId,
  openCount,
  children,
}: {
  notes: NoteView[];
  folders: NoteFolder[];
  worlds: { id: string; name: string }[];
  activeWorldId: string | null;
  openCount: number;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [seenNotes, setSeenNotes] = useState(initialNotes);
  if (seenNotes !== initialNotes) {
    setSeenNotes(initialNotes);
    setNotes(initialNotes);
  }
  const [folders, setFolders] = useState(initialFolders);
  const [seenFolders, setSeenFolders] = useState(initialFolders);
  if (seenFolders !== initialFolders) {
    setSeenFolders(initialFolders);
    setFolders(initialFolders);
  }
  const [scope, setScope] = useState<Scope>("all");
  const [tag, setTag] = useState<string | null>(null);
  // Nur die aktive Welt (plus Notizen ohne Welt); ohne aktive Welt alle
  const world = activeWorldId && worlds.some((w) => w.id === activeWorldId) ? activeWorldId : "all";
  const [sort, setSortState] = useState<Sort>({ key: "updated", dir: "desc" });
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [undo, setUndo] = useState<{ id: string; title: string } | null>(null);

  // Gemerkte Sortierung (nur im Browser lesbar, daher erst nach dem Laden)
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(SORT_STORAGE) ?? "null") as Sort | null;
      if (raw && ["updated", "created", "title"].includes(raw.key) && (raw.dir === "asc" || raw.dir === "desc")) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSortState(raw);
      }
    } catch {
      /* ohne gemerkte Sortierung weiter */
    }
  }, []);
  const setSort = useCallback((s: Sort) => {
    setSortState(s);
    try {
      localStorage.setItem(SORT_STORAGE, JSON.stringify(s));
    } catch {
      /* nicht merken */
    }
  }, []);

  // Änderungen aus dem Editor daneben (Titel, Text, Tags, Ordner …) sofort zeigen
  useEffect(() => {
    const onPatch = (e: Event) => {
      const patch = (e as CustomEvent<NotePatch>).detail;
      setNotes((cur) => cur.map((n) => (n.id === patch.id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n)));
    };
    window.addEventListener(NOTE_PATCH_EVENT, onPatch);
    return () => window.removeEventListener(NOTE_PATCH_EVENT, onPatch);
  }, []);

  useEffect(() => {
    if (!undo) return;
    const t = window.setTimeout(() => setUndo(null), 6000);
    return () => window.clearTimeout(t);
  }, [undo]);

  const patchNote = useCallback((id: string, patch: Partial<NoteView>) => setNotes((cur) => cur.map((x) => (x.id === id ? { ...x, ...patch } : x))), []);
  const removeNotes = useCallback((ids: string[]) => {
    const gone = new Set(ids);
    setNotes((cur) => cur.filter((x) => !gone.has(x.id)));
  }, []);

  const inWorldAll = useMemo(() => (world === "all" ? notes : notes.filter((n) => n.worldId === null || n.worldId === world)), [notes, world]);
  const live = useMemo(() => inWorldAll.filter((n) => !n.deletedAt && !n.archived), [inWorldAll]);
  const archived = useMemo(() => inWorldAll.filter((n) => !n.deletedAt && n.archived), [inWorldAll]);
  const trashed = useMemo(() => inWorldAll.filter((n) => n.deletedAt).sort((a, b) => (b.deletedAt ?? "").localeCompare(a.deletedAt ?? "")), [inWorldAll]);

  const [mountedAt] = useState(() => Date.now());
  const recentCutoff = useMemo(() => new Date(mountedAt - RECENT_DAYS * 24 * 3600 * 1000).toISOString(), [mountedAt]);
  const recentCount = useMemo(() => live.filter((n) => n.updatedAt >= recentCutoff).length, [live, recentCutoff]);
  const untaggedCount = useMemo(() => live.filter((n) => n.tags.length === 0).length, [live]);

  const folderCount = useMemo(() => {
    const direct = new Map<string, number>();
    for (const n of live) direct.set(n.folderId ?? "none", (direct.get(n.folderId ?? "none") ?? 0) + 1);
    const m = new Map<string, number>([["none", direct.get("none") ?? 0]]);
    for (const f of folders) {
      let sum = 0;
      for (const id of descendantIds(folders, f.id)) sum += direct.get(id) ?? 0;
      m.set(f.id, sum);
    }
    return m;
  }, [live, folders]);

  const tagCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of live) for (const t of n.tags) m.set(t, (m.get(t) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "de"));
  }, [live]);

  const shown = useMemo(() => {
    const base = scope === "archive" ? archived : scope === "trash" ? trashed : live;
    const ids = !["all", "recent", "untagged", "none", "archive", "trash"].includes(scope) ? descendantIds(folders, scope) : null;
    const list = base.filter((n) => {
      if (scope === "recent" && n.updatedAt < recentCutoff) return false;
      if (scope === "untagged" && n.tags.length > 0) return false;
      if (scope === "none" && n.folderId !== null) return false;
      if (ids && !(n.folderId && ids.has(n.folderId))) return false;
      if (tag && !n.tags.some((t) => tagMatches(t, tag))) return false;
      return noteMatches(n, q);
    });
    return scope === "trash" ? list : [...list].sort(compareNotes(sort));
  }, [live, archived, trashed, scope, folders, tag, q, sort, recentCutoff]);

  const exportQuery = new URLSearchParams({
    ...(!["all", "recent", "untagged", "archive", "trash"].includes(scope) ? { ordner: scope } : {}),
    ...(tag ? { tag } : {}),
    ...(world !== "all" ? { welt: world } : {}),
  }).toString();

  async function trash(n: NoteView) {
    const err = await trashNote(n.id);
    if (err) return setError(err);
    patchNote(n.id, { deletedAt: new Date().toISOString() });
    setUndo({ id: n.id, title: noteTitle(n) });
  }
  async function restore(n: NoteView) {
    const err = await restoreNote(n.id);
    if (err) return setError(err);
    patchNote(n.id, { deletedAt: null });
    setUndo(null);
  }
  async function toggleArchive(n: NoteView) {
    const err = await archiveNote(n.id, !n.archived);
    if (err) return setError(err);
    patchNote(n.id, { archived: !n.archived });
  }
  async function deleteForever(n: NoteView) {
    if (!(await confirmDialog({ message: `„${noteTitle(n)}“ endgültig löschen?`, confirmLabel: "Löschen", danger: true }))) return;
    const err = await deleteNote(n.id);
    if (err) return setError(err);
    removeNotes([n.id]);
  }
  async function clearTrash() {
    if (!(await confirmDialog({ message: `Papierkorb leeren? ${trashed.length === 1 ? "Die Notiz wird" : `${trashed.length} Notizen werden`} endgültig gelöscht.`, confirmLabel: "Leeren", danger: true }))) return;
    const err = await emptyTrash();
    if (err) return setError(err);
    setNotes((cur) => cur.filter((x) => !x.deletedAt));
  }

  async function createFolder(name: string, parentId: string | null) {
    const r = await createNoteFolder(name, parentId);
    if ("error" in r) {
      setError(r.error);
      return null;
    }
    setFolders((cur) => [...cur, r.folder]);
    return r.folder;
  }
  async function renameFolder(id: string, name: string, parentId: string | null) {
    const err = await renameNoteFolder(id, name);
    if (err) {
      setError(err);
      return false;
    }
    const before = folders.find((f) => f.id === id)?.parentId ?? null;
    if (parentId !== before) {
      const moveErr = await moveNoteFolder(id, parentId);
      if (moveErr) {
        setError(moveErr);
        return false;
      }
    }
    setFolders((cur) => cur.map((f) => (f.id === id ? { ...f, name, parentId } : f)));
    router.refresh();
    return true;
  }
  async function removeFolder(f: NoteFolder) {
    if (!(await confirmDialog({ message: `Ordner „${f.name}“ samt Unterordnern löschen? Die Notizen darin bleiben erhalten.`, confirmLabel: "Löschen", danger: true }))) return;
    const err = await deleteNoteFolder(f.id);
    if (err) return setError(err);
    const gone = descendantIds(folders, f.id);
    setFolders((cur) => cur.filter((x) => !gone.has(x.id)));
    setScope(f.parentId ?? "all");
    router.refresh();
  }

  const value: Store = {
    notes,
    folders,
    worlds,
    openCount,
    scope,
    setScope: (s) => {
      setScope(s);
      setSelected(new Set());
    },
    tag,
    setTag,
    world,
    sort,
    setSort,
    q,
    setQ,
    error,
    setError,
    live,
    archived,
    trashed,
    recentCount,
    untaggedCount,
    folderCount,
    tagCounts,
    shown,
    exportQuery,
    selecting,
    setSelecting: (v) => {
      setSelecting(v);
      if (!v) setSelected(new Set());
    },
    selected,
    setSelected,
    patchNote,
    removeNotes,
    trash,
    restore,
    toggleArchive,
    deleteForever,
    clearTrash,
    createFolder,
    renameFolder,
    removeFolder,
    undo,
    dismissUndo: () => setUndo(null),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
