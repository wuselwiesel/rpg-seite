"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FolderPlus, MoreHorizontal, Plus } from "lucide-react";
import { FolderDialog, type FolderDialogState } from "./folder-dialog";
import type { TreeFolder } from "@/lib/wiki-tree";

// Aktionen auf der Ordnerseite: Artikel und Unterordner anlegen, der Rest im Menü.
export function FolderActionsBar({
  folder,
  tree,
  allFolders,
  canDelete,
}: {
  folder: TreeFolder;
  tree: TreeFolder[];
  allFolders: { id: string; parent_id: string | null; name: string; created_by: string | null }[];
  canDelete: boolean;
}) {
  const [dialog, setDialog] = useState<FolderDialogState | null>(null);
  const [menu, setMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setMenu(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const item = "block w-full px-3.5 py-2 text-left text-sm text-fg transition hover:bg-surface-2";
  const open = (state: FolderDialogState) => {
    setMenu(false);
    setDialog(state);
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/wiki/new?folder=${folder.id}`}
          className="flex items-center gap-1.5 rounded-lg bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" strokeWidth={2.25} />
          Artikel anlegen
        </Link>
        <button
          type="button"
          onClick={() => open({ kind: "new", parent: folder })}
          className="flex items-center gap-1.5 rounded-lg bg-surface-2 px-3.5 py-2 text-sm font-medium text-fg-soft transition hover:text-fg"
        >
          <FolderPlus className="h-4 w-4" strokeWidth={2} />
          Unterordner
        </button>
        <div ref={ref} className="relative">
          <button
            type="button"
            onClick={() => setMenu((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menu}
            aria-label="Weitere Aktionen für diesen Ordner"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg"
          >
            <MoreHorizontal className="h-5 w-5" strokeWidth={2} />
          </button>
          {menu && (
            <div role="menu" className="absolute left-0 top-full z-30 mt-1 w-48 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-lg">
              <button role="menuitem" type="button" className={item} onClick={() => open({ kind: "rename", folder })}>
                Bearbeiten (Name, Icon, Farbe)
              </button>
              <button role="menuitem" type="button" className={item} onClick={() => open({ kind: "move", folder })}>
                Verschieben
              </button>
              {canDelete && (
                <button role="menuitem" type="button" className={`${item} text-red-600 dark:text-red-400`} onClick={() => open({ kind: "delete", folder })}>
                  Löschen
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {dialog && (
        <FolderDialog
          key={dialog.kind}
          state={dialog}
          tree={tree}
          allFolders={allFolders}
          currentFolderId={folder.id}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  );
}
