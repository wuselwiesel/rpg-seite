"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Folder, FolderPlus, Hash, Pencil, Pin, Plus, Search, Trash2, X } from "lucide-react";
import { RevealRow } from "@/components/reveal-row";
import { NotesTabs } from "./notes-tabs";
import { NoteLinkChip } from "@/components/note-link-chip";
import { confirmDialog } from "@/components/confirm-dialog";
import { createNote, createNoteFolder, deleteNote, deleteNoteFolder, renameNoteFolder } from "./actions";
import { noteMatches, noteSnippet, noteTitle, type NoteFolder, type NoteView } from "@/lib/notes";

const dayFormat = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Berlin" });

// „all“ = alle Notizen, „none“ = ohne Ordner, sonst die ID eines Ordners
type Scope = "all" | "none" | string;

const chip = (on: boolean) => `flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition ${on ? "bg-accent-strong text-on-accent-strong" : "bg-surface-2 text-fg-soft hover:text-fg"}`;

export function NotesList({ notes: initialNotes, folders: initialFolders, openCount }: { notes: NoteView[]; folders: NoteFolder[]; openCount: number }) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  // Nach Änderungen auf dem Server (z. B. Ordner löschen) kommen neue Daten herein
  const [seen, setSeen] = useState(initialNotes);
  if (seen !== initialNotes) {
    setSeen(initialNotes);
    setNotes(initialNotes);
  }
  const [folders, setFolders] = useState(initialFolders);
  const [scope, setScope] = useState<Scope>("all");
  const [tag, setTag] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Name eines neuen Ordners („“ = Eingabefeld offen) oder Umbenennen (ID → Name)
  const [newFolder, setNewFolder] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of notes) m.set(n.folderId ?? "none", (m.get(n.folderId ?? "none") ?? 0) + 1);
    return m;
  }, [notes]);
  const withoutFolder = counts.get("none") ?? 0;
  const tags = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of notes) for (const t of n.tags) m.set(t, (m.get(t) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "de"));
  }, [notes]);

  const shown = useMemo(
    () => notes.filter((n) => (scope === "all" || (scope === "none" ? n.folderId === null : n.folderId === scope)) && (!tag || n.tags.includes(tag)) && noteMatches(n, q)),
    [notes, scope, tag, q],
  );
  const folderName = (id: string | null) => folders.find((f) => f.id === id)?.name;
  const current = folders.find((f) => f.id === scope);

  function add() {
    setError(null);
    start(async () => {
      const r = await createNote({ folderId: current?.id ?? null });
      if (r.error || !r.id) setError(r.error ?? "Konnte nicht angelegt werden.");
      else router.push(`/notizen/${r.id}`);
    });
  }

  function addFolder() {
    const name = newFolder ?? "";
    if (!name.trim()) return setNewFolder(null);
    setError(null);
    start(async () => {
      const r = await createNoteFolder(name);
      if ("error" in r) return setError(r.error);
      setFolders((cur) => [...cur, r.folder]);
      setScope(r.folder.id);
      setNewFolder(null);
    });
  }

  function rename() {
    if (!renaming) return;
    const id = renaming;
    const name = renameText.trim();
    setError(null);
    start(async () => {
      const err = await renameNoteFolder(id, name);
      if (err) return setError(err);
      setFolders((cur) => cur.map((f) => (f.id === id ? { ...f, name } : f)));
      setRenaming(null);
      router.refresh();
    });
  }

  async function removeNote(n: NoteView) {
    if (!(await confirmDialog({ message: `„${noteTitle(n)}“ löschen?`, confirmLabel: "Löschen", danger: true }))) return;
    const err = await deleteNote(n.id);
    if (err) return setError(err);
    setNotes((cur) => cur.filter((x) => x.id !== n.id));
  }

  async function removeFolder(f: NoteFolder) {
    if (!(await confirmDialog({ message: `Ordner „${f.name}“ löschen? Die Notizen darin bleiben erhalten.`, confirmLabel: "Löschen", danger: true }))) return;
    const err = await deleteNoteFolder(f.id);
    if (err) return setError(err);
    setFolders((cur) => cur.filter((x) => x.id !== f.id));
    setScope("all");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="font-serif text-3xl text-fg">Notizen</h1>
        <button type="button" onClick={add} disabled={pending} className="flex items-center gap-1.5 rounded-full bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-60">
          <Plus className="h-4 w-4" strokeWidth={2.25} />
          Neue Notiz
        </button>
      </div>
      <NotesTabs active="notizen" openCount={openCount} />
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="-mx-4 mb-3 flex items-center gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <button type="button" onClick={() => setScope("all")} aria-pressed={scope === "all"} className={chip(scope === "all")}>
          Alle <span className="text-xs opacity-70">{notes.length}</span>
        </button>
        {folders.map((f) => (
          <button key={f.id} type="button" onClick={() => setScope(f.id)} aria-pressed={scope === f.id} className={chip(scope === f.id)}>
            <Folder className="h-3.5 w-3.5" strokeWidth={2} />
            {f.name} <span className="text-xs opacity-70">{counts.get(f.id) ?? 0}</span>
          </button>
        ))}
        {folders.length > 0 && withoutFolder > 0 && (
          <button type="button" onClick={() => setScope("none")} aria-pressed={scope === "none"} className={chip(scope === "none")}>
            Ohne Ordner <span className="text-xs opacity-70">{withoutFolder}</span>
          </button>
        )}
        {newFolder === null ? (
          <button type="button" onClick={() => setNewFolder("")} title="Neuer Ordner" aria-label="Neuer Ordner" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg">
            <FolderPlus className="h-4 w-4" strokeWidth={2} />
          </button>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addFolder();
            }}
            className="flex shrink-0 items-center gap-1"
          >
            <input autoFocus value={newFolder} onChange={(e) => setNewFolder(e.target.value)} maxLength={60} placeholder="Name des Ordners" aria-label="Name des Ordners" className="w-40 rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-fg outline-none focus:border-accent" />
            <button type="submit" aria-label="Ordner anlegen" className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-strong text-on-accent-strong">
              <Check className="h-4 w-4" strokeWidth={2.25} />
            </button>
            <button type="button" onClick={() => setNewFolder(null)} aria-label="Abbrechen" className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-2">
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </form>
        )}
      </div>

      {current && (
        <div className="mb-3 flex items-center gap-1">
          {renaming === current.id ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                rename();
              }}
              className="flex items-center gap-1"
            >
              <input autoFocus value={renameText} onChange={(e) => setRenameText(e.target.value)} maxLength={60} aria-label="Neuer Name" className="w-48 rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-fg outline-none focus:border-accent" />
              <button type="submit" aria-label="Umbenennen" className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-strong text-on-accent-strong">
                <Check className="h-4 w-4" strokeWidth={2.25} />
              </button>
              <button type="button" onClick={() => setRenaming(null)} aria-label="Abbrechen" className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-2">
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </form>
          ) : (
            <>
              <span className="mr-1 text-sm font-medium text-fg">{current.name}</span>
              <button type="button" onClick={() => { setRenaming(current.id); setRenameText(current.name); }} title="Ordner umbenennen" aria-label="Ordner umbenennen" className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg">
                <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
              <button type="button" onClick={() => void removeFolder(current)} title="Ordner löschen" aria-label="Ordner löschen" className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-red-600">
                <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </>
          )}
        </div>
      )}

      {notes.length > 0 && (
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={2} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="In Notizen suchen" className="w-full rounded-full border border-line bg-surface py-2.5 pl-10 pr-4 text-sm text-fg outline-none focus:border-accent" />
        </div>
      )}
      {tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5" aria-label="Tags">
          {tags.map(([t, n]) => (
            <button key={t} type="button" onClick={() => setTag(tag === t ? null : t)} aria-pressed={tag === t} className={`flex items-center gap-0.5 rounded-full px-2.5 py-0.5 text-xs transition ${tag === t ? "bg-accent text-on-accent-strong" : "bg-surface-2 text-fg-soft hover:text-fg"}`}>
              <Hash className="h-3 w-3" strokeWidth={2.25} />
              {t} <span className="ml-0.5 opacity-60">{n}</span>
            </button>
          ))}
        </div>
      )}

      {notes.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted">Noch keine Notizen.</p>
      ) : shown.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted">{scope !== "all" && !q && !tag ? "Hier liegt noch nichts." : "Nichts gefunden."}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((n) => (
            <RevealRow
              key={n.id}
              className="items-start gap-0 rounded-2xl border border-line bg-surface transition hover:border-accent/40"
              actions={
                <button type="button" onClick={() => void removeNote(n)} title="Notiz löschen" aria-label="Notiz löschen" className="m-2 flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-red-600">
                  <Trash2 className="h-4 w-4" strokeWidth={2} />
                </button>
              }
            >
              <div className="min-w-0 flex-1">
              <Link href={`/notizen/${n.id}`} className="block px-4 pt-3.5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="min-w-0 truncate text-[15px] font-semibold text-fg">{noteTitle(n)}</h2>
                  <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted">
                    {n.pinned && <Pin className="h-3 w-3 text-accent" strokeWidth={2.25} aria-label="Angeheftet" />}
                    {dayFormat.format(new Date(n.updatedAt))}
                  </span>
                </div>
                {n.title.trim() && noteSnippet(n.body) && <p className="mt-1 line-clamp-2 text-sm text-fg-soft">{noteSnippet(n.body)}</p>}
              </Link>
              <div className="flex flex-wrap items-center gap-1.5 px-4 pb-3.5 pt-2.5">
                {scope === "all" && n.folderId && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted">
                    <Folder className="h-3 w-3" strokeWidth={2} />
                    {folderName(n.folderId)}
                  </span>
                )}
                {n.links.slice(0, 6).map((l) => (
                  <NoteLinkChip key={l.id} link={l} />
                ))}
                {n.links.length > 6 && <span className="text-xs text-muted">+{n.links.length - 6}</span>}
                {n.tags.map((t) => (
                  <span key={t} className="text-xs text-muted">#{t}</span>
                ))}
              </div>
              </div>
            </RevealRow>
          ))}
        </ul>
      )}
    </div>
  );
}
