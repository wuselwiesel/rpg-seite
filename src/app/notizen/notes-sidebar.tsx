"use client";

import { useMemo, useState } from "react";
import { Archive, ChevronDown, ChevronRight, Clock, Folder, FolderPlus, Hash, Inbox, Pencil, StickyNote, Tag, Trash2, Check, X } from "lucide-react";
import { useNotesStore } from "./notes-store";
import { MAX_FOLDER_DEPTH, buildFolderTree, buildTagTree, canMoveFolder, flattenFolders, tagMatches, type FolderNode, type NoteFolder, type TagNode } from "@/lib/notes";

const NOTES_MIME = "application/x-notes";
const FOLDER_MIME = "application/x-note-folder";

const row = "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition";
const idle = "text-fg-soft hover:bg-surface-2 hover:text-fg";
const on = "bg-accent-strong text-on-accent-strong";
const iconBtn = "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface hover:text-fg";

// Register des Notizbuchs: Ansichten, Ordnerbaum und Tag-Baum. Notizen aus der Liste lassen sich auf Ordner, Tags, Archiv und Papierkorb ziehen. onPick: nach dem Wählen einer Ansicht, eines Ordners oder Tags (schließt das Register).
export function NotesSidebar({ onPick }: { onPick?: () => void } = {}) {
  const s = useNotesStore();
  const { folders, scope, setScope, tag, setTag, live, archived, trashed, folderCount, recentCount, untaggedCount } = s;
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState<{ parentId: string | null; name: string } | null>(null);
  const [editing, setEditing] = useState<{ id: string; name: string; parentId: string } | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  const [overEdge, setOverEdge] = useState<"before" | "inside" | "after">("inside");

  const tree = useMemo(() => buildFolderTree(folders), [folders]);
  const tagTree = useMemo(() => buildTagTree(live.flatMap((n) => n.tags)), [live]);
  const tagCount = (full: string) => live.filter((n) => n.tags.some((t) => tagMatches(t, full))).length;
  const withoutFolder = folderCount.get("none") ?? 0;

  const toggle = (key: string) =>
    setCollapsed((cur) => {
      const next = new Set(cur);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  function noteIds(e: React.DragEvent): string[] {
    try {
      const raw = e.dataTransfer.getData(NOTES_MIME);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  }
  const hasType = (e: React.DragEvent, mime: string) => e.dataTransfer.types.includes(mime);

  // Ziel für Notizen (Ordner, Tag, Archiv, Papierkorb, Ohne Ordner)
  function noteTarget(key: string, onDrop: (ids: string[]) => void) {
    return {
      onDragOver: (e: React.DragEvent) => {
        if (!hasType(e, NOTES_MIME)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setOverKey(key);
      },
      onDragLeave: () => setOverKey((k) => (k === key ? null : k)),
      onDrop: (e: React.DragEvent) => {
        if (!hasType(e, NOTES_MIME)) return;
        e.preventDefault();
        setOverKey(null);
        const ids = noteIds(e);
        if (ids.length) onDrop(ids);
      },
    };
  }
  const ring = (key: string) => (overKey === key ? "ring-2 ring-accent bg-accent/10" : "");

  async function dropFolder(draggedId: string, target: NoteFolder, edge: "before" | "inside" | "after") {
    if (draggedId === target.id) return;
    if (edge === "inside") {
      await s.moveFolder(draggedId, target.id);
      setCollapsed((cur) => {
        const next = new Set(cur);
        next.delete(target.id);
        return next;
      });
      return;
    }
    const dragged = folders.find((f) => f.id === draggedId);
    if (!dragged) return;
    if (dragged.parentId !== target.parentId && !(await s.moveFolder(draggedId, target.parentId))) return;
    const siblings = folders
      .filter((f) => f.parentId === target.parentId && f.id !== draggedId)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.name.localeCompare(b.name, "de"))
      .map((f) => f.id);
    const at = siblings.indexOf(target.id) + (edge === "after" ? 1 : 0);
    siblings.splice(at, 0, draggedId);
    await s.reorderFolders(siblings);
  }

  function view(key: string, label: string, count: number, icon: React.ReactNode, drop?: (ids: string[]) => void) {
    const active = scope === key && !tag;
    return (
      <button key={key} type="button" onClick={() => { setScope(key); setTag(null); onPick?.(); }} aria-pressed={active} className={`${row} ${active ? on : idle} ${ring(`view:${key}`)}`} {...(drop ? noteTarget(`view:${key}`, drop) : {})}>
        {icon}
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <span className="text-xs opacity-70">{count}</span>
      </button>
    );
  }

  function nameForm(value: string, onChange: (v: string) => void, onSubmit: () => void, onCancel: () => void, extra?: React.ReactNode) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="flex flex-col gap-1 px-1 py-1"
      >
        <input autoFocus value={value} onChange={(e) => onChange(e.target.value)} maxLength={60} placeholder="Name des Ordners" aria-label="Name des Ordners" className="w-full rounded-lg border border-line bg-surface px-2 py-1 text-sm text-fg outline-none focus:border-accent" />
        {extra}
        <span className="flex gap-1">
          <button type="submit" aria-label="Speichern" className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-strong text-on-accent-strong">
            <Check className="h-3.5 w-3.5" strokeWidth={2.25} />
          </button>
          <button type="button" onClick={onCancel} aria-label="Abbrechen" className="flex h-6 w-6 items-center justify-center rounded-full text-muted hover:bg-surface-2">
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </span>
      </form>
    );
  }

  async function submitAdd() {
    if (!adding) return;
    const name = adding.name.trim();
    if (!name) return setAdding(null);
    const f = await s.createFolder(name, adding.parentId);
    if (f) {
      setAdding(null);
      setScope(f.id);
      setCollapsed((cur) => {
        const next = new Set(cur);
        if (adding.parentId) next.delete(adding.parentId);
        return next;
      });
    }
  }

  async function submitEdit() {
    if (!editing) return;
    if (await s.renameFolder(editing.id, editing.name.trim(), editing.parentId || null)) setEditing(null);
  }

  function folderNode(n: FolderNode): React.ReactNode {
    const key = `folder:${n.id}`;
    const active = scope === n.id && !tag;
    const open = !collapsed.has(n.id);
    const count = folderCount.get(n.id) ?? 0;
    const isEditing = editing?.id === n.id;
    return (
      <li key={n.id}>
        {isEditing && editing ? (
          nameForm(
            editing.name,
            (v) => setEditing({ ...editing, name: v }),
            () => void submitEdit(),
            () => setEditing(null),
            <select value={editing.parentId} onChange={(e) => setEditing({ ...editing, parentId: e.target.value })} aria-label="Liegt in" className="w-full rounded-lg border border-line bg-surface px-1.5 py-1 text-xs text-fg-soft outline-none">
              <option value="">Oberste Ebene</option>
              {flattenFolders(folders)
                .filter((o) => o.id !== n.id && canMoveFolder(folders, n.id, o.id))
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {"– ".repeat(o.depth - 1)}
                    {o.name}
                  </option>
                ))}
            </select>,
          )
        ) : (
          <div
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(FOLDER_MIME, n.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(e) => {
              if (!hasType(e, NOTES_MIME) && !hasType(e, FOLDER_MIME)) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setOverKey(key);
              if (hasType(e, FOLDER_MIME)) {
                const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const y = (e.clientY - r.top) / r.height;
                setOverEdge(y < 0.25 ? "before" : y > 0.75 ? "after" : "inside");
              } else setOverEdge("inside");
            }}
            onDragLeave={() => setOverKey((k) => (k === key ? null : k))}
            onDrop={(e) => {
              e.preventDefault();
              setOverKey(null);
              if (hasType(e, NOTES_MIME)) {
                const ids = noteIds(e);
                if (ids.length) void s.bulkApply(ids, { kind: "move", folderId: n.id });
              } else if (hasType(e, FOLDER_MIME)) void dropFolder(e.dataTransfer.getData(FOLDER_MIME), n, overEdge);
            }}
            className={`group/f relative flex items-center rounded-lg ${active ? on : idle} ${overKey === key ? (overEdge === "before" ? "border-t-2 border-accent" : overEdge === "after" ? "border-b-2 border-accent" : "ring-2 ring-accent bg-accent/10") : ""}`}
            style={{ paddingLeft: `${(n.depth - 1) * 0.75}rem` }}
          >
            {n.children.length > 0 ? (
              <button type="button" onClick={() => toggle(n.id)} aria-label={open ? "Zuklappen" : "Aufklappen"} aria-expanded={open} className={iconBtn}>
                {open ? <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} /> : <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />}
              </button>
            ) : (
              <span className="w-6 shrink-0" />
            )}
            <button type="button" onClick={() => { setScope(n.id); setTag(null); onPick?.(); }} aria-pressed={active} className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 pr-1 text-left text-sm">
              <Folder className="h-4 w-4 shrink-0" strokeWidth={2} />
              <span className="min-w-0 flex-1 truncate">{n.name}</span>
              <span className={`text-xs opacity-70 ${active ? "hidden" : "group-hover/f:hidden"}`}>{count}</span>
            </button>
            <span className={`shrink-0 items-center ${active ? "flex [&>button]:text-on-accent-strong/80 [&>button:hover]:bg-white/15 [&>button:hover]:text-on-accent-strong" : "hidden group-hover/f:flex"}`}>
              {n.depth < MAX_FOLDER_DEPTH && (
                <button type="button" onClick={() => setAdding({ parentId: n.id, name: "" })} aria-label="Neuer Unterordner" title="Neuer Unterordner" className={iconBtn}>
                  <FolderPlus className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              )}
              <button type="button" onClick={() => setEditing({ id: n.id, name: n.name, parentId: n.parentId ?? "" })} aria-label="Ordner umbenennen oder verschieben" title="Ordner umbenennen oder verschieben" className={iconBtn}>
                <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
              <button type="button" onClick={() => void s.removeFolder(n)} aria-label="Ordner löschen" title="Ordner löschen" className={`${iconBtn} hover:text-red-600`}>
                <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </span>
          </div>
        )}
        {adding?.parentId === n.id && <div style={{ paddingLeft: `${n.depth * 0.75}rem` }}>{nameForm(adding.name, (v) => setAdding({ ...adding, name: v }), () => void submitAdd(), () => setAdding(null))}</div>}
        {open && n.children.length > 0 && <ul className="flex flex-col gap-0.5">{n.children.map((c) => folderNode(c))}</ul>}
      </li>
    );
  }

  function tagNode(n: TagNode, depth: number): React.ReactNode {
    const key = `tag:${n.full}`;
    const active = tag === n.full;
    const open = !collapsed.has(key);
    return (
      <li key={n.full}>
        <div className={`flex items-center rounded-lg ${active ? on : idle} ${ring(key)}`} style={{ paddingLeft: `${depth * 0.75}rem` }} {...noteTarget(key, (ids) => void s.bulkApply(ids, { kind: "addTag", tag: n.full }))}>
          {n.children.length > 0 ? (
            <button type="button" onClick={() => toggle(key)} aria-label={open ? "Zuklappen" : "Aufklappen"} aria-expanded={open} className={iconBtn}>
              {open ? <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} /> : <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />}
            </button>
          ) : (
            <span className="w-6 shrink-0" />
          )}
          <button type="button" onClick={() => { setTag(active ? null : n.full); if (!active) setScope("all"); onPick?.(); }} aria-pressed={active} className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 pr-2 text-left text-sm">
            <Hash className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            <span className="min-w-0 flex-1 truncate">{n.name}</span>
            <span className="text-xs opacity-70">{tagCount(n.full)}</span>
          </button>
        </div>
        {open && n.children.length > 0 && <ul className="flex flex-col gap-0.5">{n.children.map((c) => tagNode(c, depth + 1))}</ul>}
      </li>
    );
  }

  const heading = "px-1 pb-1 pt-3 text-xs font-medium text-muted";
  return (
    <nav aria-label="Ordner und Tags" className="flex flex-col gap-0.5">
      <div className="grid grid-cols-2 gap-0.5">
        {view("all", "Alle Notizen", live.length, <StickyNote className="h-4 w-4 shrink-0" strokeWidth={2} />)}
        {view("recent", "Zuletzt geändert", recentCount, <Clock className="h-4 w-4 shrink-0" strokeWidth={2} />)}
        {view("untagged", "Ohne Tag", untaggedCount, <Tag className="h-4 w-4 shrink-0" strokeWidth={2} />)}
        {view("none", "Ohne Ordner", withoutFolder, <Inbox className="h-4 w-4 shrink-0" strokeWidth={2} />, (ids) => void s.bulkApply(ids, { kind: "move", folderId: null }))}
      </div>

      <div className="flex items-center justify-between pr-1">
        <h2 className={heading}>Ordner</h2>
        <button type="button" onClick={() => setAdding({ parentId: null, name: "" })} aria-label="Neuer Ordner" title="Neuer Ordner" className={`${iconBtn} mt-2`}>
          <FolderPlus className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
      {adding?.parentId === null && nameForm(adding.name, (v) => setAdding({ ...adding, name: v }), () => void submitAdd(), () => setAdding(null))}
      {tree.length > 0 ? <ul className="flex flex-col gap-0.5">{tree.map((n) => folderNode(n))}</ul> : adding === null && <p className="px-1 text-xs text-muted">Keine Ordner.</p>}

      {tagTree.length > 0 && (
        <>
          <h2 className={heading}>Tags</h2>
          <ul className="flex flex-col gap-0.5">{tagTree.map((n) => tagNode(n, 0))}</ul>
        </>
      )}

      <div className="mt-2 grid grid-cols-2 gap-0.5 border-t border-line pt-2">
        {view("archive", "Archiv", archived.length, <Archive className="h-4 w-4 shrink-0" strokeWidth={2} />, (ids) => void s.bulkApply(ids, { kind: "archive", archived: true }))}
        {view("trash", "Papierkorb", trashed.length, <Trash2 className="h-4 w-4 shrink-0" strokeWidth={2} />, (ids) => void s.bulkApply(ids, { kind: "trash" }))}
      </div>
    </nav>
  );
}
