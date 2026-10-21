"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Check, ChevronDown, ChevronRight, Folder, FolderPlus, GripVertical, MapPin, Pencil, Trash2, X } from "lucide-react";
import { confirmDialog } from "@/components/confirm-dialog";
import { MAX_FOLDER_DEPTH, canMoveFolder, descendantIds, flattenFolders } from "@/lib/folder-tree";
import { compareScenes, placeScene, shiftScene } from "@/lib/scene-order";
import { createSceneFolder, deleteSceneFolder, moveSceneFolder, renameSceneFolder, reorderSceneFolders, saveSceneOrder } from "../folder-actions";

export type OrganizerFolder = { id: string; name: string; parentId: string | null; position: number; canEdit: boolean };
export type OrganizerScene = { id: string; title: string; folderId: string | null; sortOrder: number | null; createdAt: string; location: string | null; author: string; canEdit: boolean };

const iconBtn = "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg disabled:opacity-30 disabled:hover:bg-transparent";

// Szenen in Ordnern anordnen: Ziehen (Maus) oder ↑/↓ und „Verschieben nach“ (Handy); Ordner anlegen, umbenennen, verschieben, umsortieren, löschen.
export function SceneOrganizer({ worldId, initialFolders, initialScenes }: { worldId: string; initialFolders: OrganizerFolder[]; initialScenes: OrganizerScene[] }) {
  const [folders, setFolders] = useState(initialFolders);
  const [scenes, setScenes] = useState(initialScenes);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState<{ parentId: string | null; name: string } | null>(null);
  const [editing, setEditing] = useState<{ id: string; name: string; parentId: string } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  const busy = useRef(false);

  const folderLikes = useMemo(() => folders.map((f) => ({ id: f.id, name: f.name, parentId: f.parentId })), [folders]);
  const scenesIn = (folderId: string | null) => scenes.filter((s) => s.folderId === folderId).sort(compareScenes);
  const childrenOf = (parentId: string | null) => folders.filter((f) => f.parentId === parentId).sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, "de"));
  const depthOf = (id: string) => {
    let d = 1;
    let cur = folders.find((f) => f.id === id);
    while (cur?.parentId) {
      d++;
      cur = folders.find((f) => f.id === cur?.parentId);
    }
    return d;
  };
  const totalIn = (folderId: string) => {
    const ids = descendantIds(folderLikes, folderId);
    return scenes.filter((s) => s.folderId && ids.has(s.folderId)).length;
  };

  // Szenen an eine Stelle setzen (Ordner + Position), sofort zeigen und speichern
  async function moveScene(id: string, targetFolderId: string | null, beforeId: string | null) {
    const scene = scenes.find((s) => s.id === id);
    if (!scene || !scene.canEdit) return;
    const current = scenesIn(targetFolderId).map((s) => s.id);
    const ordered = placeScene(current, id, beforeId);
    await applyOrder(targetFolderId, ordered);
  }

  async function shift(id: string, folderId: string | null, dir: -1 | 1) {
    const ordered = shiftScene(scenesIn(folderId).map((s) => s.id), id, dir);
    await applyOrder(folderId, ordered);
  }

  async function applyOrder(folderId: string | null, ordered: string[]) {
    if (busy.current) return;
    busy.current = true;
    setError(null);
    const before = scenes;
    const index = new Map(ordered.map((sid, i) => [sid, i]));
    setScenes((cur) => cur.map((s) => (index.has(s.id) && s.canEdit ? { ...s, folderId, sortOrder: index.get(s.id) as number } : s)));
    const r = await saveSceneOrder(worldId, folderId, ordered);
    busy.current = false;
    if ("error" in r) {
      setScenes(before);
      setError(r.error);
    }
  }

  async function addFolder() {
    if (!adding) return;
    const name = adding.name.trim();
    if (!name) return setAdding(null);
    setError(null);
    const r = await createSceneFolder(worldId, name, adding.parentId);
    if ("error" in r) return setError(r.error);
    setFolders((cur) => [...cur, { ...r.folder, position: cur.filter((f) => f.parentId === r.folder.parentId).length, canEdit: true }]);
    setCollapsed((cur) => {
      const next = new Set(cur);
      if (adding.parentId) next.delete(adding.parentId);
      return next;
    });
    setAdding(null);
  }

  async function saveEdit() {
    if (!editing) return;
    const f = folders.find((x) => x.id === editing.id);
    if (!f) return setEditing(null);
    const name = editing.name.trim();
    const parentId = editing.parentId || null;
    setError(null);
    let err = name !== f.name ? await renameSceneFolder(f.id, name) : null;
    if (!err && parentId !== f.parentId) err = await moveSceneFolder(worldId, f.id, parentId);
    if (err) return setError(err);
    setFolders((cur) => cur.map((x) => (x.id === f.id ? { ...x, name, parentId } : x)));
    setEditing(null);
  }

  async function removeFolder(f: OrganizerFolder) {
    if (!(await confirmDialog({ message: `Ordner „${f.name}“ samt Unterordnern löschen? Die Szenen darin bleiben erhalten.`, confirmLabel: "Löschen", danger: true }))) return;
    const err = await deleteSceneFolder(f.id);
    if (err) return setError(err);
    const gone = descendantIds(folderLikes, f.id);
    setFolders((cur) => cur.filter((x) => !gone.has(x.id)));
    setScenes((cur) => cur.map((s) => (s.folderId && gone.has(s.folderId) ? { ...s, folderId: null } : s)));
  }

  async function shiftFolder(f: OrganizerFolder, dir: -1 | 1) {
    const siblings = childrenOf(f.parentId).map((x) => x.id);
    const ordered = shiftScene(siblings, f.id, dir);
    if (ordered.join() === siblings.join()) return;
    const pos = new Map(ordered.map((id, i) => [id, i]));
    setFolders((cur) => cur.map((x) => (pos.has(x.id) ? { ...x, position: pos.get(x.id) as number } : x)));
    const err = await reorderSceneFolders(ordered);
    if (err) setError(err);
  }

  function sceneRow(s: OrganizerScene, folderId: string | null) {
    const list = scenesIn(folderId);
    const i = list.findIndex((x) => x.id === s.id);
    const key = `scene:${s.id}`;
    return (
      <li
        key={s.id}
        draggable={s.canEdit}
        onDragStart={(e) => {
          setDragId(s.id);
          e.dataTransfer.setData("text/plain", s.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragEnd={() => {
          setDragId(null);
          setOverKey(null);
        }}
        onDragOver={(e) => {
          if (!dragId || dragId === s.id) return;
          e.preventDefault();
          setOverKey(key);
        }}
        onDragLeave={() => setOverKey((k) => (k === key ? null : k))}
        onDrop={(e) => {
          e.preventDefault();
          setOverKey(null);
          const id = dragId;
          setDragId(null);
          if (id && id !== s.id) void moveScene(id, folderId, s.id);
        }}
        className={`flex items-center gap-1.5 rounded-xl border bg-surface px-2 py-1.5 transition ${overKey === key ? "border-accent border-t-4" : "border-line"} ${dragId === s.id ? "opacity-40" : ""}`}
      >
        <GripVertical className={`h-4 w-4 shrink-0 ${s.canEdit ? "cursor-grab text-muted" : "text-transparent"}`} strokeWidth={2} aria-hidden />
        <div className="min-w-0 flex-1">
          <Link href={`/story/${s.id}`} className="block truncate text-sm font-medium text-fg hover:text-accent">
            {s.title}
          </Link>
          <p className="flex items-center gap-1.5 truncate text-xs text-muted">
            {s.author}
            {s.location && (
              <span className="flex items-center gap-0.5">
                <MapPin className="h-3 w-3" strokeWidth={2} />
                {s.location}
              </span>
            )}
          </p>
        </div>
        {s.canEdit && (
          <>
            <button type="button" onClick={() => void shift(s.id, folderId, -1)} disabled={i <= 0} aria-label="Nach oben" title="Nach oben" className={iconBtn}>
              <ArrowUp className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
            <button type="button" onClick={() => void shift(s.id, folderId, 1)} disabled={i === list.length - 1} aria-label="Nach unten" title="Nach unten" className={iconBtn}>
              <ArrowDown className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
            <select
              value={folderId ?? ""}
              onChange={(e) => void moveScene(s.id, e.target.value || null, null)}
              aria-label="Verschieben nach"
              title="Verschieben nach"
              className="w-9 shrink-0 cursor-pointer rounded-full border border-line bg-surface py-1 text-xs text-fg-soft outline-none sm:w-28"
            >
              <option value="">Ohne Ordner</option>
              {flattenFolders(folderLikes).map((f) => (
                <option key={f.id} value={f.id}>
                  {"– ".repeat(f.depth - 1)}
                  {f.name}
                </option>
              ))}
            </select>
          </>
        )}
      </li>
    );
  }

  function dropZone(folderId: string | null, key: string, children: React.ReactNode) {
    return (
      <div
        onDragOver={(e) => {
          if (!dragId) return;
          e.preventDefault();
          setOverKey(key);
        }}
        onDragLeave={() => setOverKey((k) => (k === key ? null : k))}
        onDrop={(e) => {
          e.preventDefault();
          setOverKey(null);
          const id = dragId;
          setDragId(null);
          if (id) void moveScene(id, folderId, null);
        }}
        className={`rounded-xl transition ${overKey === key ? "bg-accent/10 ring-2 ring-accent" : ""}`}
      >
        {children}
      </div>
    );
  }

  function nameForm(value: string, onChange: (v: string) => void, onSubmit: () => void, onCancel: () => void, extra?: React.ReactNode) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="flex flex-wrap items-center gap-1"
      >
        <input autoFocus value={value} onChange={(e) => onChange(e.target.value)} maxLength={60} placeholder="Name des Ordners" aria-label="Name des Ordners" className="w-44 rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-fg outline-none focus:border-accent" />
        {extra}
        <button type="submit" aria-label="Speichern" className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-strong text-on-accent-strong">
          <Check className="h-4 w-4" strokeWidth={2.25} />
        </button>
        <button type="button" onClick={onCancel} aria-label="Abbrechen" className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-2">
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </form>
    );
  }

  function folderBlock(f: OrganizerFolder): React.ReactNode {
    const depth = depthOf(f.id);
    const siblings = childrenOf(f.parentId);
    const si = siblings.findIndex((x) => x.id === f.id);
    const open = !collapsed.has(f.id);
    const list = scenesIn(f.id);
    const key = `folder:${f.id}`;
    const isEditing = editing?.id === f.id;
    return (
      <section key={f.id} aria-label={f.name} className={depth > 1 ? "ml-4 border-l border-line pl-3" : ""}>
        {dropZone(
          f.id,
          key,
          <div className="flex flex-wrap items-center gap-1 px-1 py-1.5">
            <button
              type="button"
              onClick={() =>
                setCollapsed((cur) => {
                  const next = new Set(cur);
                  if (next.has(f.id)) next.delete(f.id);
                  else next.add(f.id);
                  return next;
                })
              }
              aria-expanded={open}
              aria-label={open ? "Zuklappen" : "Aufklappen"}
              className={iconBtn}
            >
              {open ? <ChevronDown className="h-4 w-4" strokeWidth={2} /> : <ChevronRight className="h-4 w-4" strokeWidth={2} />}
            </button>
            <Folder className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} aria-hidden />
            {isEditing && editing ? (
              nameForm(
                editing.name,
                (v) => setEditing({ ...editing, name: v }),
                () => void saveEdit(),
                () => setEditing(null),
                <select value={editing.parentId} onChange={(e) => setEditing({ ...editing, parentId: e.target.value })} aria-label="Liegt in" className="rounded-full border border-line bg-surface px-2.5 py-1.5 text-sm text-fg-soft outline-none focus:border-accent">
                  <option value="">Oberste Ebene</option>
                  {flattenFolders(folderLikes)
                    .filter((o) => o.id !== f.id && canMoveFolder(folderLikes, f.id, o.id))
                    .map((o) => (
                      <option key={o.id} value={o.id}>
                        {"– ".repeat(o.depth - 1)}
                        {o.name}
                      </option>
                    ))}
                </select>,
              )
            ) : (
              <>
                <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-fg">
                  {f.name} <span className="font-normal text-muted">{totalIn(f.id)}</span>
                </h2>
                <button type="button" onClick={() => void shiftFolder(f, -1)} disabled={!f.canEdit || si <= 0} aria-label="Ordner nach oben" title="Ordner nach oben" className={iconBtn}>
                  <ArrowUp className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
                <button type="button" onClick={() => void shiftFolder(f, 1)} disabled={!f.canEdit || si === siblings.length - 1} aria-label="Ordner nach unten" title="Ordner nach unten" className={iconBtn}>
                  <ArrowDown className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
                {depth < MAX_FOLDER_DEPTH && (
                  <button type="button" onClick={() => setAdding({ parentId: f.id, name: "" })} aria-label="Neuer Unterordner" title="Neuer Unterordner" className={iconBtn}>
                    <FolderPlus className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                )}
                {f.canEdit && (
                  <>
                    <button type="button" onClick={() => setEditing({ id: f.id, name: f.name, parentId: f.parentId ?? "" })} aria-label="Ordner umbenennen oder verschieben" title="Ordner umbenennen oder verschieben" className={iconBtn}>
                      <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                    <button type="button" onClick={() => void removeFolder(f)} aria-label="Ordner löschen" title="Ordner löschen" className={`${iconBtn} hover:text-red-600`}>
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  </>
                )}
              </>
            )}
          </div>,
        )}
        {adding?.parentId === f.id && <div className="mb-1 ml-8">{nameForm(adding.name, (v) => setAdding({ ...adding, name: v }), () => void addFolder(), () => setAdding(null))}</div>}
        {open && (
          <div className="ml-2 flex flex-col gap-1 pb-2">
            {list.length > 0 && <ul className="flex flex-col gap-1">{list.map((s) => sceneRow(s, f.id))}</ul>}
            {childrenOf(f.id).map((c) => folderBlock(c))}
          </div>
        )}
      </section>
    );
  }

  const loose = scenesIn(null);
  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <div>
        {adding?.parentId === null ? (
          nameForm(adding.name, (v) => setAdding({ ...adding, name: v }), () => void addFolder(), () => setAdding(null))
        ) : (
          <button type="button" onClick={() => setAdding({ parentId: null, name: "" })} className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm text-fg-soft transition hover:bg-surface-2 hover:text-fg">
            <FolderPlus className="h-4 w-4" strokeWidth={2} />
            Neuer Ordner
          </button>
        )}
      </div>
      <div className="flex flex-col gap-1">
        {childrenOf(null).map((f) => folderBlock(f))}
        <section aria-label="Ohne Ordner">
          {dropZone(
            null,
            "root",
            <h2 className="flex items-center gap-2 px-2 py-1.5 text-sm font-semibold text-fg">
              Ohne Ordner <span className="font-normal text-muted">{loose.length}</span>
            </h2>,
          )}
          {loose.length === 0 ? <p className="px-2 pb-2 text-sm text-muted">Keine Szenen.</p> : <ul className="flex flex-col gap-1 pb-2">{loose.map((s) => sceneRow(s, null))}</ul>}
        </section>
      </div>
    </div>
  );
}
