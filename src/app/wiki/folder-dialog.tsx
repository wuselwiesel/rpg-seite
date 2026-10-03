"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createWikiFolder, deleteWikiFolder, moveWikiFolder, renameWikiFolder } from "./folder-actions";
import { folderOptions, folderSubtreeIds, type TreeFolder } from "@/lib/wiki-tree";
import { FOLDER_COLORS } from "@/lib/wiki-folder-style";
import { CustomEmojiPicker } from "@/components/custom-emoji-picker";
import { FolderGlyph } from "@/components/folder-glyph";

export type FolderDialogState =
  | { kind: "new"; parent: TreeFolder | null }
  | { kind: "rename"; folder: TreeFolder }
  | { kind: "move"; folder: TreeFolder }
  | { kind: "delete"; folder: TreeFolder };

const field = "w-full rounded-md border border-line bg-surface px-3 py-2 text-fg outline-none focus:border-accent";

// Kleines Fenster für Ordner anlegen, bearbeiten (Name, Icon, Farbe), verschieben und löschen.
export function FolderDialog({
  state,
  tree,
  allFolders,
  currentFolderId,
  onClose,
}: {
  state: FolderDialogState;
  tree: TreeFolder[];
  allFolders: { id: string; parent_id: string | null; name: string; created_by: string | null }[];
  currentFolderId: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(state.kind === "rename" ? state.folder.name : "");
  const [icon, setIcon] = useState(state.kind === "rename" ? (state.folder.icon ?? "") : "");
  const [color, setColor] = useState(state.kind === "rename" ? (state.folder.color ?? "") : "");
  const [target, setTarget] = useState<string>(state.kind === "move" ? (state.folder.parent_id ?? "") : "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      let err: string | null = null;
      if (state.kind === "new") err = await createWikiFolder(state.parent?.id ?? null, name, icon, color);
      else if (state.kind === "rename") err = await renameWikiFolder(state.folder.id, name, icon, color);
      else if (state.kind === "move") err = await moveWikiFolder(state.folder.id, target || null);
      else err = await deleteWikiFolder(state.folder.id);
      if (err) {
        setError(err);
        return;
      }
      // Wurde der gerade geöffnete Ordner gelöscht, zurück zur Übersicht.
      if (state.kind === "delete" && currentFolderId === state.folder.id) router.push("/wiki");
      onClose();
    });
  }

  const title =
    state.kind === "new"
      ? state.parent
        ? `Unterordner in „${state.parent.name}“`
        : "Neuer Ordner"
      : state.kind === "rename"
        ? "Ordner bearbeiten"
        : state.kind === "move"
          ? `„${state.folder.name}“ verschieben`
          : `„${state.folder.name}“ löschen`;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-4 sm:items-center" role="presentation" onMouseDown={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onSubmit={submit}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-line bg-surface p-5 shadow-xl"
      >
        <h2 className="font-serif text-xl text-fg">{title}</h2>

        {(state.kind === "new" || state.kind === "rename") && (
          <label className="flex flex-col gap-1 text-sm text-fg-soft">
            Name
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              required
              placeholder="z. B. Spezies"
              className={field}
            />
          </label>
        )}

        {(state.kind === "new" || state.kind === "rename") && (
          <>
            <div className="flex flex-col gap-1 text-sm text-fg-soft">
              Icon
              <div className="flex items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-md border border-line bg-app text-xl">
                  <FolderGlyph icon={icon} color={color} className="h-5 w-5" textClass="text-xl" />
                </span>
                <CustomEmojiPicker
                  direction="down"
                  onPick={(token) => setIcon(token.trim().slice(0, 40))}
                  className="flex h-10 items-center gap-1.5 rounded-md border border-line px-3 text-sm text-fg-soft transition hover:bg-surface-2 hover:text-fg"
                />
                {icon && (
                  <button type="button" onClick={() => setIcon("")} className="text-xs text-muted hover:text-fg">
                    Zurücksetzen
                  </button>
                )}
              </div>
            </div>
            <fieldset className="flex flex-col gap-1.5 text-sm text-fg-soft">
              <legend className="mb-1">Farbe</legend>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setColor("")}
                  aria-pressed={color === ""}
                  title="Standard"
                  className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs text-muted ${color === "" ? "border-accent ring-2 ring-accent/40" : "border-line"}`}
                >
                  –
                </button>
                {FOLDER_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    aria-pressed={color === c.id}
                    aria-label={c.label}
                    title={c.label}
                    className={`h-7 w-7 rounded-full border-2 ${color === c.id ? "border-fg ring-2 ring-accent/40" : "border-transparent"}`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </fieldset>
          </>
        )}

        {state.kind === "move" && (
          <label className="flex flex-col gap-1 text-sm text-fg-soft">
            Neuer Ort
            <select value={target} onChange={(e) => setTarget(e.target.value)} className={field}>
              <option value="">Oberste Ebene</option>
              {folderOptions(tree, folderSubtreeIds(allFolders, state.folder.id)).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )}

        {state.kind === "delete" && (
          <p className="text-sm text-fg-soft">
            Die Seiten und Unterordner in diesem Ordner gehen nicht verloren. Sie rücken eine Ebene nach oben.
          </p>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md px-3 py-2 text-sm text-fg-soft transition hover:bg-surface-2">
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={pending}
            className={`rounded-md px-4 py-2 text-sm font-medium transition hover:opacity-90 disabled:opacity-50 ${
              state.kind === "delete" ? "bg-red-600 text-white" : "bg-accent-strong text-on-accent-strong"
            }`}
          >
            {pending
              ? "…"
              : state.kind === "new"
                ? "Anlegen"
                : state.kind === "rename"
                  ? "Speichern"
                  : state.kind === "move"
                    ? "Verschieben"
                    : "Löschen"}
          </button>
        </div>
      </form>
    </div>
  );
}
