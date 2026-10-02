"use client";

import { useState } from "react";
import Link from "next/link";
import { FolderDialog, type FolderDialogState } from "./folder-dialog";
import type { TreeFolder } from "@/lib/wiki-tree";

// Knöpfe auf der Ordnerseite: Artikel anlegen, Unterordner, Umbenennen, Verschieben, Löschen.
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
  const ghost = "rounded-md bg-surface-2 px-3 py-1.5 text-sm text-fg-soft transition hover:text-fg";
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/wiki/new?folder=${folder.id}`}
          className="rounded-md bg-accent-strong px-4 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90"
        >
          Artikel hier anlegen
        </Link>
        <button type="button" className={ghost} onClick={() => setDialog({ kind: "new", parent: folder })}>
          Unterordner
        </button>
        <button type="button" className={ghost} onClick={() => setDialog({ kind: "rename", folder })}>
          Umbenennen
        </button>
        <button type="button" className={ghost} onClick={() => setDialog({ kind: "move", folder })}>
          Verschieben
        </button>
        {canDelete && (
          <button
            type="button"
            className="rounded-md px-3 py-1.5 text-sm text-red-600 transition hover:bg-surface-2 dark:text-red-400"
            onClick={() => setDialog({ kind: "delete", folder })}
          >
            Löschen
          </button>
        )}
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
