"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Check, Download, Folder, FolderPlus, Hash, Pencil, Pin, Plus, Printer, RotateCcw, Search, Trash2, X } from "lucide-react";
import { RevealRow } from "@/components/reveal-row";
import { NotesTabs } from "./notes-tabs";
import { TemplateMenu } from "@/components/template-menu";
import { NoteLinkChip } from "@/components/note-link-chip";
import { confirmDialog } from "@/components/confirm-dialog";
import { archiveNote, createNote, createNoteFolder, deleteNote, deleteNoteFolder, emptyTrash, moveNoteFolder, renameNoteFolder, restoreNote, trashNote } from "./actions";
import { NOTE_PATCH_EVENT, type NotePatch } from "@/lib/note-events";
import { MAX_FOLDER_DEPTH, canMoveFolder, descendantIds, flattenFolders, folderPath, noteMatches, noteSnippet, noteTitle, type NoteFolder, type NoteView } from "@/lib/notes";

const dayFormat = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Berlin" });

// „all“ = alle Notizen, „none“ = ohne Ordner, „archive“, „trash“, sonst die ID eines Ordners
type Scope = "all" | "none" | "archive" | "trash" | string;

const chip = (on: boolean) => `flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition ${on ? "bg-accent-strong text-on-accent-strong" : "bg-surface-2 text-fg-soft hover:text-fg"}`;

export function NotesList({ notes: initialNotes, folders: initialFolders, openCount, worlds, activeWorldId, pane = false }: { notes: NoteView[]; folders: NoteFolder[]; openCount: number; worlds: { id: string; name: string }[]; activeWorldId: string | null; pane?: boolean }) {
  const router = useRouter();
  const activeId = /^\/notizen\/([0-9a-f-]{36})/.exec(usePathname())?.[1] ?? null;
  const [notes, setNotes] = useState(initialNotes);
  // Nach Änderungen auf dem Server (z. B. Ordner löschen) kommen neue Daten herein
  const [seen, setSeen] = useState(initialNotes);
  if (seen !== initialNotes) {
    setSeen(initialNotes);
    setNotes(initialNotes);
  }
  const [folders, setFolders] = useState(initialFolders);
  // Änderungen aus dem Editor daneben (Titel, Text, Tags, Ordner …) sofort in der Liste zeigen
  useEffect(() => {
    const onPatch = (e: Event) => {
      const patch = (e as CustomEvent<NotePatch>).detail;
      setNotes((cur) => cur.map((n) => (n.id === patch.id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n)));
    };
    window.addEventListener(NOTE_PATCH_EVENT, onPatch);
    return () => window.removeEventListener(NOTE_PATCH_EVENT, onPatch);
  }, []);
  const [scope, setScope] = useState<Scope>("all");
  // Welt: eine Welt-ID (zeigt ihre Notizen und die ohne Welt) oder „all“ = alle Welten
  const [world, setWorld] = useState<string>(activeWorldId && worlds.some((w) => w.id === activeWorldId) ? activeWorldId : "all");
  const [tag, setTag] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Name eines neuen Ordners („“ = Eingabefeld offen) oder Umbenennen (ID → Name)
  const [newFolder, setNewFolder] = useState<string | null>(null);
  // In welchem Ordner der neue Ordner entsteht (null = oberste Ebene)
  const [newParent, setNewParent] = useState<string | null>(null);
  const [renameParent, setRenameParent] = useState<string>("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");

  // Angeheftete zuerst, dann zuletzt geändert
  const sorted = useMemo(() => [...notes].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt)), [notes]);
  const inWorldAll = useMemo(() => (world === "all" ? sorted : sorted.filter((n) => n.worldId === null || n.worldId === world)), [sorted, world]);
  const live = useMemo(() => inWorldAll.filter((n) => !n.deletedAt && !n.archived), [inWorldAll]);
  const archived = useMemo(() => inWorldAll.filter((n) => !n.deletedAt && n.archived), [inWorldAll]);
  const trashed = useMemo(() => inWorldAll.filter((n) => n.deletedAt).sort((a, b) => (b.deletedAt ?? "").localeCompare(a.deletedAt ?? "")), [inWorldAll]);
  const inWorld = scope === "archive" ? archived : scope === "trash" ? trashed : live;
  // Notizen je Ordner zählen auch die der Unterordner mit
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
  const withoutFolder = folderCount.get("none") ?? 0;
  const tags = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of inWorld) for (const t of n.tags) m.set(t, (m.get(t) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "de"));
  }, [inWorld]);

  const scopeIds = useMemo(() => (scope === "all" || scope === "none" || scope === "archive" || scope === "trash" ? null : descendantIds(folders, scope)), [folders, scope]);
  const shown = useMemo(
    () => inWorld.filter((n) => (scope === "all" || scope === "archive" || scope === "trash" || (scope === "none" ? n.folderId === null : !!n.folderId && !!scopeIds?.has(n.folderId))) && (!tag || n.tags.includes(tag)) && noteMatches(n, q)),
    [inWorld, scope, scopeIds, tag, q],
  );
  const folderName = (id: string | null) => folders.find((f) => f.id === id)?.name;
  const current = folders.find((f) => f.id === scope);
  const path = current ? folderPath(folders, current.id) : [];
  const rootFolders = folders.filter((f) => f.parentId === null).sort((a, b) => a.name.localeCompare(b.name, "de"));
  const subFolders = current ? folders.filter((f) => f.parentId === current.id).sort((a, b) => a.name.localeCompare(b.name, "de")) : [];
  const canNest = path.length < MAX_FOLDER_DEPTH;
  // Auswahl für PDF/Text: aktueller Ordner, Tag und Welt
  const exportQuery = new URLSearchParams({
    ...(scope !== "all" ? { ordner: scope } : {}),
    ...(tag ? { tag } : {}),
    ...(world !== "all" ? { welt: world } : {}),
  }).toString();

  function add() {
    setError(null);
    start(async () => {
      const r = await createNote({ folderId: current?.id ?? null });
      if (r.error || !r.id) setError(r.error ?? "Konnte nicht angelegt werden.");
      else {
        router.push(`/notizen/${r.id}`);
        router.refresh();
      }
    });
  }

  function addFolder() {
    const name = newFolder ?? "";
    if (!name.trim()) return setNewFolder(null);
    setError(null);
    start(async () => {
      const r = await createNoteFolder(name, newParent);
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
    const parentId = renameParent || null;
    setError(null);
    start(async () => {
      const err = await renameNoteFolder(id, name);
      if (err) return setError(err);
      const before = folders.find((f) => f.id === id)?.parentId ?? null;
      if (parentId !== before) {
        const moveErr = await moveNoteFolder(id, parentId);
        if (moveErr) return setError(moveErr);
      }
      setFolders((cur) => cur.map((f) => (f.id === id ? { ...f, name, parentId } : f)));
      setRenaming(null);
      router.refresh();
    });
  }

  // Papierkorb mit „Rückgängig“; endgültig löschen gibt es nur im Papierkorb selbst
  const [undo, setUndo] = useState<{ id: string; title: string } | null>(null);
  useEffect(() => {
    if (!undo) return;
    const t = window.setTimeout(() => setUndo(null), 6000);
    return () => window.clearTimeout(t);
  }, [undo]);

  function patchNote(id: string, patch: Partial<NoteView>) {
    setNotes((cur) => cur.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  async function removeNote(n: NoteView) {
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

  async function removeForever(n: NoteView) {
    if (!(await confirmDialog({ message: `„${noteTitle(n)}“ endgültig löschen?`, confirmLabel: "Löschen", danger: true }))) return;
    const err = await deleteNote(n.id);
    if (err) return setError(err);
    setNotes((cur) => cur.filter((x) => x.id !== n.id));
  }

  async function clearTrash() {
    if (!(await confirmDialog({ message: `Papierkorb leeren? ${trashed.length === 1 ? "Die Notiz wird" : `${trashed.length} Notizen werden`} endgültig gelöscht.`, confirmLabel: "Leeren", danger: true }))) return;
    const err = await emptyTrash();
    if (err) return setError(err);
    setNotes((cur) => cur.filter((x) => !x.deletedAt));
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

  return (
    <div className={pane ? "px-3 py-4" : "mx-auto max-w-3xl px-4 py-8 sm:px-6"}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-serif text-3xl text-fg">Notizen</h1>
        <div className="flex items-center gap-2">
          <TemplateMenu folderId={current?.id ?? null} />
          <button type="button" onClick={add} disabled={pending} className="flex items-center gap-1.5 rounded-full bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-60">
            <Plus className="h-4 w-4" strokeWidth={2.25} />
            Neue Notiz
          </button>
        </div>
      </div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <NotesTabs active="notizen" openCount={openCount} className="mb-0" />
        {worlds.length > 1 && (
          <select value={world} onChange={(e) => setWorld(e.target.value)} aria-label="Welt" className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-fg-soft outline-none focus:border-accent">
            {worlds.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
            <option value="all">Alle Welten</option>
          </select>
        )}
      </div>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="-mx-4 mb-3 flex items-center gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <button type="button" onClick={() => setScope("all")} aria-pressed={scope === "all"} className={chip(scope === "all")}>
          Alle <span className="text-xs opacity-70">{live.length}</span>
        </button>
        {rootFolders.map((f) => (
          <button key={f.id} type="button" onClick={() => setScope(f.id)} aria-pressed={path[0]?.id === f.id} className={chip(path[0]?.id === f.id)}>
            <Folder className="h-3.5 w-3.5" strokeWidth={2} />
            {f.name} <span className="text-xs opacity-70">{folderCount.get(f.id) ?? 0}</span>
          </button>
        ))}
        {folders.length > 0 && withoutFolder > 0 && (
          <button type="button" onClick={() => setScope("none")} aria-pressed={scope === "none"} className={chip(scope === "none")}>
            Ohne Ordner <span className="text-xs opacity-70">{withoutFolder}</span>
          </button>
        )}
        {archived.length > 0 && (
          <button type="button" onClick={() => setScope("archive")} aria-pressed={scope === "archive"} className={chip(scope === "archive")}>
            <Archive className="h-3.5 w-3.5" strokeWidth={2} />
            Archiv <span className="text-xs opacity-70">{archived.length}</span>
          </button>
        )}
        {trashed.length > 0 && (
          <button type="button" onClick={() => setScope("trash")} aria-pressed={scope === "trash"} className={chip(scope === "trash")}>
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
            Papierkorb <span className="text-xs opacity-70">{trashed.length}</span>
          </button>
        )}
        {newFolder === null || newParent !== null ? (
          <button type="button" onClick={() => { setNewParent(null); setNewFolder(""); }} title="Neuer Ordner" aria-label="Neuer Ordner" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg">
            <FolderPlus className="h-4 w-4" strokeWidth={2} />
          </button>
        ) : (
          <FolderNameForm value={newFolder} onChange={setNewFolder} onSubmit={addFolder} onCancel={() => setNewFolder(null)} />
        )}
      </div>

      {current && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <nav aria-label="Ordnerpfad" className="flex items-center gap-1 text-sm">
            <button type="button" onClick={() => setScope("all")} className="text-muted hover:text-fg">
              Alle
            </button>
            {path.map((p, i) => (
              <span key={p.id} className="flex items-center gap-1">
                <span className="text-muted">›</span>
                {i === path.length - 1 ? (
                  <span className="font-medium text-fg">{p.name}</span>
                ) : (
                  <button type="button" onClick={() => setScope(p.id)} className="text-muted hover:text-fg">
                    {p.name}
                  </button>
                )}
              </span>
            ))}
          </nav>
          {renaming === current.id ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                rename();
              }}
              className="flex flex-wrap items-center gap-1"
            >
              <input autoFocus value={renameText} onChange={(e) => setRenameText(e.target.value)} maxLength={60} aria-label="Neuer Name" className="w-44 rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-fg outline-none focus:border-accent" />
              <select value={renameParent} onChange={(e) => setRenameParent(e.target.value)} aria-label="Liegt in" className="rounded-full border border-line bg-surface px-2.5 py-1.5 text-sm text-fg-soft outline-none focus:border-accent">
                <option value="">Oberste Ebene</option>
                {flattenFolders(folders)
                  .filter((o) => o.id !== current.id && canMoveFolder(folders, current.id, o.id))
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {"– ".repeat(o.depth - 1)}
                      {o.name}
                    </option>
                  ))}
              </select>
              <button type="submit" aria-label="Speichern" className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-strong text-on-accent-strong">
                <Check className="h-4 w-4" strokeWidth={2.25} />
              </button>
              <button type="button" onClick={() => setRenaming(null)} aria-label="Abbrechen" className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-2">
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </form>
          ) : (
            <>
              <button type="button" onClick={() => { setRenaming(current.id); setRenameText(current.name); setRenameParent(current.parentId ?? ""); }} title="Ordner umbenennen oder verschieben" aria-label="Ordner umbenennen oder verschieben" className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg">
                <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
              <button type="button" onClick={() => void removeFolder(current)} title="Ordner löschen" aria-label="Ordner löschen" className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-red-600">
                <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </>
          )}
          {subFolders.map((f) => (
            <button key={f.id} type="button" onClick={() => setScope(f.id)} className={chip(false)}>
              <Folder className="h-3.5 w-3.5" strokeWidth={2} />
              {f.name} <span className="text-xs opacity-70">{folderCount.get(f.id) ?? 0}</span>
            </button>
          ))}
          {canNest &&
            (newFolder !== null && newParent === current.id ? (
              <FolderNameForm value={newFolder} onChange={setNewFolder} onSubmit={addFolder} onCancel={() => setNewFolder(null)} />
            ) : (
              <button type="button" onClick={() => { setNewParent(current.id); setNewFolder(""); }} title="Neuer Unterordner" aria-label="Neuer Unterordner" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg">
                <FolderPlus className="h-4 w-4" strokeWidth={2} />
              </button>
            ))}
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

      {scope === "trash" && trashed.length > 0 && (
        <div className="mb-3 flex justify-end">
          <button type="button" onClick={() => void clearTrash()} className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-surface-2">
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
            Papierkorb leeren
          </button>
        </div>
      )}
      {shown.length > 0 && scope !== "trash" && (
        <div className="mb-3 flex items-center justify-end gap-1">
          <a href={`/notizen/druck?${exportQuery}`} target="_blank" rel="noreferrer" title="Auswahl als PDF" aria-label="Auswahl als PDF" className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-muted transition hover:bg-surface-2 hover:text-fg">
            <Printer className="h-3.5 w-3.5" strokeWidth={2} />
            PDF
          </a>
          <a href={`/notizen/export?${exportQuery}`} download title="Auswahl als Text" aria-label="Auswahl als Text" className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-muted transition hover:bg-surface-2 hover:text-fg">
            <Download className="h-3.5 w-3.5" strokeWidth={2} />
            Text
          </a>
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
              className={`items-start gap-0 rounded-2xl border bg-surface transition hover:border-accent/40 ${n.id === activeId ? "border-accent/60 bg-surface-2" : "border-line"}`}
              actions={
                n.deletedAt ? (
                  <>
                    <button type="button" onClick={() => void restore(n)} title="Wiederherstellen" aria-label="Wiederherstellen" className="m-1 flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg">
                      <RotateCcw className="h-4 w-4" strokeWidth={2} />
                    </button>
                    <button type="button" onClick={() => void removeForever(n)} title="Endgültig löschen" aria-label="Endgültig löschen" className="m-1 flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-red-600">
                      <Trash2 className="h-4 w-4" strokeWidth={2} />
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => void toggleArchive(n)} title={n.archived ? "Aus dem Archiv holen" : "Archivieren"} aria-label={n.archived ? "Aus dem Archiv holen" : "Archivieren"} className="m-1 flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg">
                      {n.archived ? <ArchiveRestore className="h-4 w-4" strokeWidth={2} /> : <Archive className="h-4 w-4" strokeWidth={2} />}
                    </button>
                    <button type="button" onClick={() => void removeNote(n)} title="In den Papierkorb" aria-label="In den Papierkorb" className="m-1 flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-red-600">
                      <Trash2 className="h-4 w-4" strokeWidth={2} />
                    </button>
                  </>
                )
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
                {world === "all" && worlds.length > 1 && n.worldId && <span className="text-xs text-muted">{worlds.find((w) => w.id === n.worldId)?.name}</span>}
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
      {undo && (
        <div role="status" className="fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 mx-auto flex w-fit max-w-[90vw] items-center gap-3 rounded-full bg-accent-strong px-4 py-2 text-sm text-on-accent-strong shadow-lg lg:bottom-6">
          <span className="truncate">„{undo.title}“ im Papierkorb</span>
          <button type="button" onClick={() => { const n = notes.find((x) => x.id === undo.id); if (n) void restore(n); }} className="shrink-0 font-semibold underline">
            Rückgängig
          </button>
        </div>
      )}
    </div>
  );
}

function FolderNameForm({ value, onChange, onSubmit, onCancel }: { value: string; onChange: (v: string) => void; onSubmit: () => void; onCancel: () => void }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex shrink-0 items-center gap-1"
    >
      <input autoFocus value={value} onChange={(e) => onChange(e.target.value)} maxLength={60} placeholder="Name des Ordners" aria-label="Name des Ordners" className="w-40 rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-fg outline-none focus:border-accent" />
      <button type="submit" aria-label="Ordner anlegen" className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-strong text-on-accent-strong">
        <Check className="h-4 w-4" strokeWidth={2.25} />
      </button>
      <button type="button" onClick={onCancel} aria-label="Abbrechen" className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-2">
        <X className="h-4 w-4" strokeWidth={2} />
      </button>
    </form>
  );
}
