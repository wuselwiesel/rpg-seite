"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Archive, ArchiveRestore, ArrowDownUp, Check, CheckSquare, Keyboard, Upload, Download, Folder, FolderPlus, Hash, Pencil, Pin, PinOff, Plus, Printer, RotateCcw, Search, Trash2, X } from "lucide-react";
import { RevealRow } from "@/components/reveal-row";
import { NotesTabs } from "./notes-tabs";
import { TemplateMenu } from "@/components/template-menu";
import { NoteLinkChip } from "@/components/note-link-chip";
import { createNote, importMarkdownNotes, type BulkOp } from "./actions";
import { SHORTCUTS_EVENT } from "./notes-shortcuts";
import { useNotesStore, type SortKey } from "./notes-store";
import { MAX_FOLDER_DEPTH, canMoveFolder, flattenFolders, folderPath, noteSnippet, noteTitle, type NoteView } from "@/lib/notes";
import { alertDialog, confirmDialog } from "@/components/confirm-dialog";

const dayFormat = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Berlin" });

const chip = (on: boolean) => `flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition ${on ? "bg-accent-strong text-on-accent-strong" : "bg-surface-2 text-fg-soft hover:text-fg"}`;
const SORT_LABEL: Record<SortKey, string> = { updated: "Geändert", created: "Erstellt", title: "Titel" };

export function NotesList() {
  const s = useNotesStore();
  const router = useRouter();
  const activeId = /^\/notizen\/([0-9a-f-]{36})/.exec(usePathname())?.[1] ?? null;
  const { notes, folders, scope, setScope, tag, setTag, q, setQ, sort, setSort, shown, live, archived, trashed, folderCount, tagCounts, recentCount, untaggedCount, openCount, exportQuery, error, setError, selecting, setSelecting, selected, setSelected } = s;
  const [pending, start] = useTransition();
  // Neuer Ordner („“ = Eingabefeld offen), Elternordner dafür; Umbenennen/Verschieben
  const [newFolder, setNewFolder] = useState<string | null>(null);
  const [newParent, setNewParent] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");
  const [renameParent, setRenameParent] = useState("");
  const [bulkTag, setBulkTag] = useState("");
  const lastClicked = useRef<string | null>(null);

  const isFolderScope = !["all", "recent", "untagged", "none", "archive", "trash"].includes(scope);
  const current = isFolderScope ? folders.find((f) => f.id === scope) : undefined;
  const path = current ? folderPath(folders, current.id) : [];
  const rootFolders = folders.filter((f) => f.parentId === null).sort((a, b) => a.name.localeCompare(b.name, "de"));
  const subFolders = current ? folders.filter((f) => f.parentId === current.id).sort((a, b) => a.name.localeCompare(b.name, "de")) : [];
  const canNest = path.length < MAX_FOLDER_DEPTH;
  const folderName = (id: string | null) => folders.find((f) => f.id === id)?.name;
  const withoutFolder = folderCount.get("none") ?? 0;

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

  // Markdown-Dateien einlesen (Auswahl oder auf die Liste gezogen) und als Notizen anlegen
  async function importFiles(list: FileList | File[] | null) {
    const files = Array.from(list ?? []).filter((f) => /\.(md|markdown|txt)$/i.test(f.name) || f.type === "text/markdown" || f.type === "text/plain");
    if (files.length === 0) return void alertDialog("Bitte Markdown-Dateien (.md oder .txt) wählen.");
    setError(null);
    let imported = 0;
    let skipped = 0;
    for (let i = 0; i < files.length; i += 25) {
      const chunk = await Promise.all(files.slice(i, i + 25).map(async (f) => ({ name: f.name, text: f.size > 400_000 ? "" : await f.text() })));
      const r = await importMarkdownNotes(chunk, current?.id ?? null);
      if ("error" in r) return setError(r.error);
      imported += r.imported;
      skipped += r.skipped;
    }
    router.refresh();
    void alertDialog(`${imported} ${imported === 1 ? "Notiz" : "Notizen"} importiert${skipped ? `, ${skipped} übersprungen (leer oder zu groß)` : ""}.`);
  }

  function addFolder() {
    const name = (newFolder ?? "").trim();
    if (!name) return setNewFolder(null);
    setError(null);
    start(async () => {
      const f = await s.createFolder(name, newParent);
      if (f) {
        setScope(f.id);
        setNewFolder(null);
      }
    });
  }

  function rename() {
    if (!renaming) return;
    const id = renaming;
    start(async () => {
      if (await s.renameFolder(id, renameText.trim(), renameParent || null)) setRenaming(null);
    });
  }

  // ---- Mehrfachauswahl ----
  function toggleSelect(n: NoteView, shift: boolean) {
    const next = new Set(selected);
    if (shift && lastClicked.current) {
      const ids = shown.map((x) => x.id);
      const a = ids.indexOf(lastClicked.current);
      const b = ids.indexOf(n.id);
      if (a !== -1 && b !== -1) for (const id of ids.slice(Math.min(a, b), Math.max(a, b) + 1)) next.add(id);
    } else if (next.has(n.id)) next.delete(n.id);
    else next.add(n.id);
    lastClicked.current = n.id;
    setSelected(next);
  }

  async function bulk(op: BulkOp) {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (op.kind === "delete" && !(await confirmDialog({ message: `${ids.length === 1 ? "Die Notiz" : `${ids.length} Notizen`} endgültig löschen?`, confirmLabel: "Löschen", danger: true }))) return;
    if (await s.bulkApply(ids, op)) setSelected(new Set());
  }

  const selectedList = [...selected];
  const inTrash = scope === "trash";

  return (
    <div
      className="px-3 py-4"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) e.preventDefault();
      }}
      onDrop={(e) => {
        if (e.dataTransfer.files.length > 0) {
          e.preventDefault();
          void importFiles(e.dataTransfer.files);
        }
      }}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-serif text-3xl text-fg">Notizen</h1>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setSelecting(!selecting)} aria-pressed={selecting} title="Mehrere auswählen" aria-label="Mehrere auswählen" className={`flex h-9 w-9 items-center justify-center rounded-full border border-line transition ${selecting ? "bg-accent-strong text-on-accent-strong" : "text-fg-soft hover:bg-surface-2 hover:text-fg"}`}>
            <CheckSquare className="h-4 w-4" strokeWidth={2} />
          </button>
          <label title="Markdown-Dateien importieren" className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-line text-fg-soft transition hover:bg-surface-2 hover:text-fg">
            <Upload className="h-4 w-4" strokeWidth={2} />
            <span className="sr-only">Importieren</span>
            <input
              type="file"
              accept=".md,.markdown,.txt,text/markdown,text/plain"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = e.target.files;
                void importFiles(files).then(() => (e.target.value = ""));
              }}
            />
          </label>
          <button type="button" onClick={() => window.dispatchEvent(new Event(SHORTCUTS_EVENT))} title="Tastenkürzel" aria-label="Tastenkürzel" className="hidden h-9 w-9 items-center justify-center rounded-full border border-line text-fg-soft transition hover:bg-surface-2 hover:text-fg lg:flex">
            <Keyboard className="h-4 w-4" strokeWidth={2} />
          </button>
          <TemplateMenu folderId={current?.id ?? null} />
          <button type="button" onClick={add} disabled={pending} className="flex items-center gap-1.5 rounded-full bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-60">
            <Plus className="h-4 w-4" strokeWidth={2.25} />
            Neue Notiz
          </button>
        </div>
      </div>
      <div className="mb-4">
        <NotesTabs active="notizen" openCount={openCount} className="mb-0" />
      </div>
      {error && (
        <p role="alert" className="mb-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="-mx-3 mb-3 flex items-center gap-1.5 overflow-x-auto px-3 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 xl:hidden">
        <button type="button" onClick={() => setScope("all")} aria-pressed={scope === "all"} className={chip(scope === "all")}>
          Alle <span className="text-xs opacity-70">{live.length}</span>
        </button>
        {recentCount > 0 && (
          <button type="button" onClick={() => setScope("recent")} aria-pressed={scope === "recent"} className={chip(scope === "recent")}>
            Zuletzt geändert <span className="text-xs opacity-70">{recentCount}</span>
          </button>
        )}
        {untaggedCount > 0 && (
          <button type="button" onClick={() => setScope("untagged")} aria-pressed={scope === "untagged"} className={chip(scope === "untagged")}>
            Ohne Tag <span className="text-xs opacity-70">{untaggedCount}</span>
          </button>
        )}
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
        {(archived.length > 0 || scope === "archive") && (
          <button type="button" onClick={() => setScope("archive")} aria-pressed={scope === "archive"} className={chip(scope === "archive")}>
            <Archive className="h-3.5 w-3.5" strokeWidth={2} />
            Archiv <span className="text-xs opacity-70">{archived.length}</span>
          </button>
        )}
        {(trashed.length > 0 || scope === "trash") && (
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
        <div className="mb-3 flex flex-wrap items-center gap-1.5 xl:hidden">
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
              <button type="button" onClick={() => void s.removeFolder(current)} title="Ordner löschen" aria-label="Ordner löschen" className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-red-600">
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
        <div className="mb-3 flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={2} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="In Notizen suchen" className="w-full rounded-full border border-line bg-surface py-2.5 pl-10 pr-4 text-sm text-fg outline-none focus:border-accent" />
          </div>
          <div className="flex shrink-0 items-center">
            <select value={sort.key} onChange={(e) => setSort({ ...sort, key: e.target.value as SortKey })} aria-label="Sortieren nach" className="rounded-l-full border border-r-0 border-line bg-surface py-2.5 pl-3 pr-1 text-sm text-fg-soft outline-none focus:border-accent">
              {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
                <option key={k} value={k}>
                  {SORT_LABEL[k]}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => setSort({ ...sort, dir: sort.dir === "asc" ? "desc" : "asc" })} title={sort.dir === "asc" ? "Aufsteigend" : "Absteigend"} aria-label={sort.dir === "asc" ? "Aufsteigend sortiert" : "Absteigend sortiert"} className="flex h-[42px] w-9 items-center justify-center rounded-r-full border border-line bg-surface text-fg-soft transition hover:text-fg">
              <ArrowDownUp className={`h-4 w-4 transition ${sort.dir === "asc" ? "rotate-180" : ""}`} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}
      {tagCounts.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5 xl:hidden" aria-label="Tags">
          {tagCounts.map(([t, n]) => (
            <button key={t} type="button" onClick={() => setTag(tag === t ? null : t)} aria-pressed={tag === t} className={`flex items-center gap-0.5 rounded-full px-2.5 py-0.5 text-xs transition ${tag === t ? "bg-accent text-on-accent-strong" : "bg-surface-2 text-fg-soft hover:text-fg"}`}>
              <Hash className="h-3 w-3" strokeWidth={2.25} />
              {t} <span className="ml-0.5 opacity-60">{n}</span>
            </button>
          ))}
        </div>
      )}

      {inTrash && trashed.length > 0 && (
        <div className="mb-3 flex justify-end">
          <button type="button" onClick={() => void s.clearTrash()} className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-surface-2">
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
            Papierkorb leeren
          </button>
        </div>
      )}
      {shown.length > 0 && !inTrash && !selecting && (
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

      {selecting && (
        <div role="toolbar" aria-label="Auswahl" className="sticky top-0 z-20 -mx-3 mb-3 flex flex-wrap items-center gap-1.5 border-b border-line bg-app/95 px-3 py-2 backdrop-blur">
          <span className="mr-1 text-sm font-medium text-fg">{selectedList.length} gewählt</span>
          <button type="button" onClick={() => setSelected(new Set(shown.map((n) => n.id)))} className="rounded-full px-2.5 py-1 text-xs text-fg-soft hover:bg-surface-2">
            Alle
          </button>
          {selectedList.length > 0 && (
            <>
              {inTrash ? (
                <>
                  <BarButton onClick={() => void bulk({ kind: "restore" })}>
                    <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
                    Wiederherstellen
                  </BarButton>
                  <BarButton danger onClick={() => void bulk({ kind: "delete" })}>
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                    Endgültig löschen
                  </BarButton>
                </>
              ) : (
                <>
                  <select
                    value=""
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v) void bulk({ kind: "move", folderId: v === "none" ? null : v });
                    }}
                    aria-label="Verschieben nach"
                    className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-fg-soft outline-none"
                  >
                    <option value="">Verschieben nach …</option>
                    <option value="none">Ohne Ordner</option>
                    {flattenFolders(folders).map((f) => (
                      <option key={f.id} value={f.id}>
                        {"– ".repeat(f.depth - 1)}
                        {f.name}
                      </option>
                    ))}
                  </select>
                  <form
                    className="flex items-center gap-1"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const t = bulkTag.trim();
                      if (!t) return;
                      setBulkTag("");
                      void bulk({ kind: "addTag", tag: t });
                    }}
                  >
                    <input value={bulkTag} onChange={(e) => setBulkTag(e.target.value)} placeholder="#Tag" aria-label="Tag hinzufügen" className="w-20 rounded-full border border-dashed border-line bg-transparent px-2.5 py-1 text-xs text-fg outline-none focus:border-accent" />
                    <button type="submit" className="rounded-full px-2 py-1 text-xs text-fg-soft hover:bg-surface-2">
                      Hinzufügen
                    </button>
                  </form>
                  <BarButton onClick={() => void bulk({ kind: "pin", pinned: true })}>
                    <Pin className="h-3.5 w-3.5" strokeWidth={2} />
                    Anheften
                  </BarButton>
                  <BarButton onClick={() => void bulk({ kind: "pin", pinned: false })}>
                    <PinOff className="h-3.5 w-3.5" strokeWidth={2} />
                    Lösen
                  </BarButton>
                  <BarButton onClick={() => void bulk({ kind: "archive", archived: scope !== "archive" })}>
                    {scope === "archive" ? <ArchiveRestore className="h-3.5 w-3.5" strokeWidth={2} /> : <Archive className="h-3.5 w-3.5" strokeWidth={2} />}
                    {scope === "archive" ? "Aus dem Archiv" : "Archivieren"}
                  </BarButton>
                  <BarButton onClick={() => void bulk({ kind: "trash" })}>
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                    Papierkorb
                  </BarButton>
                  <a href={`/notizen/druck?ids=${selectedList.join(",")}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-fg-soft hover:bg-surface-2">
                    <Printer className="h-3.5 w-3.5" strokeWidth={2} />
                    PDF
                  </a>
                  <a href={`/notizen/export?ids=${selectedList.join(",")}`} download className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-fg-soft hover:bg-surface-2">
                    <Download className="h-3.5 w-3.5" strokeWidth={2} />
                    Text
                  </a>
                </>
              )}
            </>
          )}
          <button type="button" onClick={() => setSelecting(false)} className="ml-auto rounded-full bg-accent-strong px-3 py-1 text-xs font-medium text-on-accent-strong">
            Fertig
          </button>
        </div>
      )}

      {notes.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted">Noch keine Notizen.</p>
      ) : shown.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted">{scope !== "all" && !q && !tag ? "Hier liegt noch nichts." : "Nichts gefunden."}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((n) => {
            const isSel = selected.has(n.id);
            return (
              <RevealRow
                key={n.id}
                className={`items-start gap-0 rounded-2xl border bg-surface transition hover:border-accent/40 ${isSel ? "border-accent bg-accent/5" : n.id === activeId ? "border-accent/60 bg-surface-2" : "border-line"}`}
                actions={
                  selecting ? undefined : n.deletedAt ? (
                    <>
                      <IconBtn label="Wiederherstellen" onClick={() => void s.restore(n)}>
                        <RotateCcw className="h-4 w-4" strokeWidth={2} />
                      </IconBtn>
                      <IconBtn label="Endgültig löschen" danger onClick={() => void s.deleteForever(n)}>
                        <Trash2 className="h-4 w-4" strokeWidth={2} />
                      </IconBtn>
                    </>
                  ) : (
                    <>
                      <IconBtn label={n.archived ? "Aus dem Archiv holen" : "Archivieren"} onClick={() => void s.toggleArchive(n)}>
                        {n.archived ? <ArchiveRestore className="h-4 w-4" strokeWidth={2} /> : <Archive className="h-4 w-4" strokeWidth={2} />}
                      </IconBtn>
                      <IconBtn label="In den Papierkorb" danger onClick={() => void s.trash(n)}>
                        <Trash2 className="h-4 w-4" strokeWidth={2} />
                      </IconBtn>
                    </>
                  )
                }
              >
                {selecting && (
                  <label className="flex cursor-pointer items-center self-stretch pl-3">
                    <input type="checkbox" checked={isSel} onChange={() => undefined} onClick={(e) => toggleSelect(n, e.shiftKey)} aria-label={`${noteTitle(n)} auswählen`} className="h-4 w-4 cursor-pointer accent-[var(--accent)]" />
                  </label>
                )}
                <div
                  className="min-w-0 flex-1"
                  draggable={!selecting || isSel}
                  onDragStart={(e) => {
                    const ids = selecting && isSel ? [...selected] : [n.id];
                    e.dataTransfer.setData("application/x-notes", JSON.stringify(ids));
                    e.dataTransfer.effectAllowed = "move";
                  }}
                >
                  <Link
                    draggable={false}
                    href={`/notizen/${n.id}`}
                    onClick={(e) => {
                      if (selecting) {
                        e.preventDefault();
                        toggleSelect(n, e.shiftKey);
                      }
                    }}
                    className="block px-4 pt-3.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="min-w-0 truncate text-[15px] font-semibold text-fg">{noteTitle(n)}</h2>
                      <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted">
                        {n.pinned && <Pin className="h-3 w-3 text-accent" strokeWidth={2.25} aria-label="Angeheftet" />}
                        {dayFormat.format(new Date(sort.key === "created" && n.createdAt ? n.createdAt : n.updatedAt))}
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
                      <span key={t} className="text-xs text-muted">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              </RevealRow>
            );
          })}
        </ul>
      )}
      {s.undo && (
        <div role="status" className="fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 mx-auto flex w-fit max-w-[90vw] items-center gap-3 rounded-full bg-accent-strong px-4 py-2 text-sm text-on-accent-strong shadow-lg lg:bottom-6">
          <span className="truncate">„{s.undo.title}“ im Papierkorb</span>
          <button
            type="button"
            onClick={() => {
              const n = notes.find((x) => x.id === s.undo?.id);
              if (n) void s.restore(n);
            }}
            className="shrink-0 font-semibold underline"
          >
            Rückgängig
          </button>
        </div>
      )}
    </div>
  );
}

function IconBtn({ label, onClick, danger = false, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} className={`m-1 flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 ${danger ? "hover:text-red-600" : "hover:text-fg"}`}>
      {children}
    </button>
  );
}

function BarButton({ onClick, danger = false, children }: { onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs hover:bg-surface-2 ${danger ? "text-red-600" : "text-fg-soft"}`}>
      {children}
    </button>
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
