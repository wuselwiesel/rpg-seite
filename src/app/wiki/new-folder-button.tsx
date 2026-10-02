"use client";

import { useState } from "react";
import { FolderPlus } from "lucide-react";
import { FolderDialog } from "./folder-dialog";
import type { FolderRow, TreeFolder } from "@/lib/wiki-tree";

// "Neuer Ordner" auf der Wiki-Startseite (oberste Ebene).
export function NewFolderButton({ tree, allFolders }: { tree: TreeFolder[]; allFolders: FolderRow[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg bg-surface-2 px-3.5 py-2 text-sm font-medium text-fg-soft transition hover:text-fg"
      >
        <FolderPlus className="h-4 w-4" strokeWidth={2} />
        Neuer Ordner
      </button>
      {open && (
        <FolderDialog
          state={{ kind: "new", parent: null }}
          tree={tree}
          allFolders={allFolders}
          currentFolderId={null}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
