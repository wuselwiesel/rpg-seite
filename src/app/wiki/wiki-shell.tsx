"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, FolderPlus, MoreHorizontal } from "lucide-react";
import { FolderDialog, type FolderDialogState } from "./folder-dialog";
import { useOpenState } from "./use-open-folders";
import {
  buildWikiTree,
  folderPath,
  pageAncestors,
  type FolderRow,
  type PageRow,
  type TreeFolder,
  type TreePage,
} from "@/lib/wiki-tree";

type Props = {
  worldId: string;
  worldName: string;
  folders: FolderRow[];
  pages: PageRow[];
  userId: string;
  isWorldOwner: boolean;
  children: React.ReactNode;
};

function currentFromPath(pathname: string): { folder: string | null; page: string | null } {
  const folder = pathname.match(/^\/wiki\/ordner\/([0-9a-f-]{36})/)?.[1] ?? null;
  const page = pathname.match(/^\/wiki\/([0-9a-f-]{36})/)?.[1] ?? null;
  return { folder, page };
}

// Wiki-Rahmen: links die Ordner (einklappbar, mit Unterordnern, Seiten und Unterseiten), rechts der Inhalt.
export function WikiShell({ worldId, worldName, folders, pages, userId, isWorldOwner, children }: Props) {
  const pathname = usePathname();
  const cur = currentFromPath(pathname);
  const tree = useMemo(() => buildWikiTree(folders, pages), [folders, pages]);
  const { state: stored, save } = useOpenState(worldId);
  const [query, setQuery] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const [dialog, setDialog] = useState<FolderDialogState | null>(null);

  // Auf dem Weg zur geöffneten Seite sind alle Ordner/Oberseiten aufgeklappt, solange man sie nicht selbst zuklappt.
  const autoOpen = useMemo(() => {
    const ids = new Set<string>();
    const page = cur.page ? pages.find((p) => p.id === cur.page) : undefined;
    const folderId = cur.folder ?? page?.folder_id ?? null;
    folderPath(folders, folderId).forEach((f) => ids.add(f.id));
    if (cur.page) {
      pageAncestors(pages, cur.page).forEach((p) => ids.add(p.id));
      ids.add(cur.page); // eigene Unterseiten sofort sichtbar
    }
    return ids;
  }, [cur.folder, cur.page, folders, pages]);

  const isOpen = (id: string) => (id in stored ? stored[id] : autoOpen.has(id));
  const toggle = (id: string) => save({ ...stored, [id]: !isOpen(id) });
  const anyOpen = [...folders.map((f) => f.id), ...pages.map((p) => p.id)].some((id) => isOpen(id));
  const toggleAll = () => {
    const next: Record<string, boolean> = {};
    if (!anyOpen) for (const id of [...folders.map((f) => f.id), ...pages.map((p) => p.id)]) next[id] = true;
    else for (const id of [...folders.map((f) => f.id), ...pages.map((p) => p.id)]) next[id] = false;
    save(next);
  };

  const q = query.trim().toLowerCase();
  const hits = q
    ? pages.filter((p) => `${p.title} ${p.lead ?? ""}`.toLowerCase().includes(q)).slice(0, 12)
    : [];

  const newHref = `/wiki/new${cur.folder ? `?folder=${cur.folder}` : ""}`;
  const canDelete = (f: TreeFolder) => f.created_by === userId || isWorldOwner;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <header className="mb-5 flex items-center justify-between gap-3">
        <Link href="/wiki" className="font-serif text-3xl text-accent">
          Wiki
        </Link>
        <Link
          href={newHref}
          className="rounded-md bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90"
        >
          Neuer Artikel
        </Link>
      </header>

      <div className="grid gap-5 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-10">
        <div>
          <button
            type="button"
            onClick={() => setNavOpen((v) => !v)}
            aria-expanded={navOpen}
            className="flex w-full items-center justify-between rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg-soft lg:hidden"
          >
            Ordner und Suche <span aria-hidden>▾</span>
          </button>

          <nav
            aria-label="Wiki-Ordner"
            className={`${navOpen ? "mt-3 flex" : "hidden"} flex-col gap-3 lg:sticky lg:top-4 lg:mt-0 lg:flex lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto`}
          >
            <div className="flex gap-1.5">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Suchen"
                aria-label="Wiki durchsuchen"
                className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={() => setDialog({ kind: "new", parent: null })}
                title="Neuer Ordner"
                aria-label="Neuen Ordner anlegen"
                className="flex w-10 items-center justify-center rounded-lg border border-line bg-surface text-fg-soft transition hover:bg-surface-2 hover:text-fg"
              >
                <FolderPlus className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>

            {q ? (
              <ul className="flex flex-col">
                {hits.length === 0 && (
                  <li className="px-2 py-2 text-sm text-muted">
                    Nichts gefunden.{" "}
                    <Link href={`/wiki/new?title=${encodeURIComponent(query.trim())}`} className="text-accent hover:underline">
                      „{query.trim()}“ anlegen
                    </Link>
                  </li>
                )}
                {hits.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/wiki/${p.id}`}
                      onClick={() => {
                        setQuery("");
                        setNavOpen(false);
                      }}
                      className="flex flex-col rounded-lg px-2 py-1.5 text-sm text-fg transition hover:bg-surface-2"
                    >
                      <span className="font-medium">{p.title}</span>
                      <span className="truncate text-xs text-muted">
                        {folderPath(folders, p.folder_id).map((f) => f.name).join(" › ") || "Ohne Ordner"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <>
                <ul role="tree" className="flex flex-col">
                  {tree.folders.map((f) => (
                    <FolderNode
                      key={f.id}
                      folder={f}
                      isOpen={isOpen}
                      toggle={toggle}
                      cur={cur}
                      canDelete={canDelete}
                      onDialog={setDialog}
                      onNavigate={() => setNavOpen(false)}
                    />
                  ))}
                  {tree.loose.length > 0 && (
                    <li className="mt-2 border-t border-line pt-2">
                      <p className="px-2 pb-1 text-xs text-muted">Ohne Ordner</p>
                      <ul>
                        {tree.loose.map((p) => (
                          <PageNode key={p.id} page={p} isOpen={isOpen} toggle={toggle} cur={cur} depth={0} onNavigate={() => setNavOpen(false)} />
                        ))}
                      </ul>
                    </li>
                  )}
                </ul>
                {folders.length + pages.length > 0 && (
                  <button type="button" onClick={toggleAll} className="self-start px-2 text-xs text-muted underline underline-offset-2 hover:text-fg">
                    {anyOpen ? "Alle zuklappen" : "Alle aufklappen"}
                  </button>
                )}
                {folders.length === 0 && pages.length === 0 && (
                  <p className="px-2 text-sm text-muted">Noch nichts in {worldName}. Leg den ersten Ordner oder Artikel an.</p>
                )}
              </>
            )}
          </nav>
        </div>

        <main className="@container min-w-0">{children}</main>
      </div>

      {dialog && (
        <FolderDialog
          key={dialog.kind + ("folder" in dialog ? dialog.folder.id : (dialog.parent?.id ?? "root"))}
          state={dialog}
          tree={tree.folders}
          allFolders={folders}
          currentFolderId={cur.folder}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}

type NodeCommon = {
  isOpen: (id: string) => boolean;
  toggle: (id: string) => void;
  cur: { folder: string | null; page: string | null };
  onNavigate: () => void;
};

function Chevron({ open, label, onClick }: { open: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-label={label}
      className="flex h-8 w-6 shrink-0 items-center justify-center text-muted hover:text-fg"
    >
      <ChevronRight className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-90" : ""}`} strokeWidth={2} />
    </button>
  );
}

function FolderNode({
  folder,
  canDelete,
  onDialog,
  ...common
}: NodeCommon & {
  folder: TreeFolder;
  canDelete: (f: TreeFolder) => boolean;
  onDialog: (d: FolderDialogState) => void;
}) {
  const { isOpen, toggle, cur, onNavigate } = common;
  const hasContent = folder.children.length + folder.pages.length > 0;
  const open = isOpen(folder.id) && hasContent;
  const active = cur.folder === folder.id;
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

  const item = "block w-full px-3 py-1.5 text-left text-sm text-fg transition hover:bg-surface-2";

  return (
    <li role="treeitem" aria-selected={active} aria-expanded={hasContent ? open : undefined}>
      <div ref={ref} className={`group relative flex items-center rounded-lg ${active ? "bg-accent/10" : "hover:bg-surface-2"}`}>
        {hasContent ? (
          <Chevron open={open} label={`${folder.name} ${open ? "einklappen" : "aufklappen"}`} onClick={() => toggle(folder.id)} />
        ) : (
          <span className="w-6 shrink-0" />
        )}
        <Link
          href={`/wiki/ordner/${folder.id}`}
          onClick={onNavigate}
          className={`min-w-0 flex-1 truncate py-1.5 text-sm ${active ? "font-semibold text-accent" : "text-fg-soft"}`}
        >
          {folder.name}
        </Link>
        <span className="pr-1 text-xs text-muted group-hover:hidden group-focus-within:hidden">{folder.total}</span>
        <button
          type="button"
          onClick={() => setMenu((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={menu}
          aria-label={`Menü für ${folder.name}`}
          className="hidden h-8 w-8 shrink-0 items-center justify-center rounded text-muted hover:text-fg group-hover:flex group-focus-within:flex"
        >
          <MoreHorizontal className="h-4 w-4" strokeWidth={2} />
        </button>
        {menu && (
          <div role="menu" className="absolute right-0 top-full z-30 mt-1 w-52 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-lg">
            <Link role="menuitem" href={`/wiki/new?folder=${folder.id}`} onClick={() => { setMenu(false); onNavigate(); }} className={item}>
              Artikel hier anlegen
            </Link>
            <button role="menuitem" type="button" className={item} onClick={() => { setMenu(false); onDialog({ kind: "new", parent: folder }); }}>
              Unterordner anlegen
            </button>
            <button role="menuitem" type="button" className={item} onClick={() => { setMenu(false); onDialog({ kind: "rename", folder }); }}>
              Umbenennen
            </button>
            <button role="menuitem" type="button" className={item} onClick={() => { setMenu(false); onDialog({ kind: "move", folder }); }}>
              Verschieben
            </button>
            {canDelete(folder) && (
              <button role="menuitem" type="button" className={`${item} text-red-600 dark:text-red-400`} onClick={() => { setMenu(false); onDialog({ kind: "delete", folder }); }}>
                Löschen
              </button>
            )}
          </div>
        )}
      </div>
      {open && (
        <ul role="group" className="ml-3 border-l border-line pl-1.5">
          {folder.children.map((c) => (
            <FolderNode key={c.id} folder={c} canDelete={canDelete} onDialog={onDialog} {...common} />
          ))}
          {folder.pages.map((p) => (
            <PageNode key={p.id} page={p} depth={0} {...common} />
          ))}
        </ul>
      )}
    </li>
  );
}

function PageNode({ page, depth, ...common }: NodeCommon & { page: TreePage; depth: number }) {
  const { isOpen, toggle, cur, onNavigate } = common;
  const hasKids = page.children.length > 0;
  const open = isOpen(page.id) && hasKids;
  const active = cur.page === page.id;
  return (
    <li role="treeitem" aria-selected={active} aria-expanded={hasKids ? open : undefined}>
      <div className={`flex items-center rounded-lg ${active ? "bg-accent/10" : "hover:bg-surface-2"}`}>
        {hasKids ? (
          <Chevron open={open} label={`${page.title} ${open ? "einklappen" : "aufklappen"}`} onClick={() => toggle(page.id)} />
        ) : (
          <span className="w-6 shrink-0" />
        )}
        <Link
          href={`/wiki/${page.id}`}
          onClick={onNavigate}
          className={`min-w-0 flex-1 truncate py-1.5 pr-2 text-sm ${active ? "font-semibold text-accent" : "text-fg-soft"}`}
        >
          {page.title}
        </Link>
      </div>
      {open && (
        <ul role="group" className="ml-3 border-l border-line pl-1.5">
          {page.children.map((c) => (
            <PageNode key={c.id} page={c} depth={depth + 1} {...common} />
          ))}
        </ul>
      )}
    </li>
  );
}
