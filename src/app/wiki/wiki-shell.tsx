"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Folder, FolderOpen, FolderPlus, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import { Wordmark } from "@/components/wordmark";
import { FolderDialog, type FolderDialogState } from "./folder-dialog";
import { useNavHidden, useOpenState } from "./use-open-folders";
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
  const { hidden: navHidden, setHidden: setNavHidden } = useNavHidden();
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

  const canDelete = (f: TreeFolder) => f.created_by === userId || isWorldOwner;

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-6 sm:py-8 lg:px-8">
      <header className="mb-6 hidden items-center justify-between gap-4 border-b border-line pb-4 lg:flex">
        <Link href="/" aria-label="Wortwinkel" className="block">
          <Wordmark height={36} />
        </Link>
        <nav aria-label="Zurück in die App" className="flex items-center gap-1 text-sm">
          {[
            { href: "/story", label: "Story" },
            { href: "/characters/relationships", label: "Beziehungen" },
            { href: "/profile", label: "Profil" },
          ].map((l) => (
            <Link key={l.href} href={l.href} className="rounded-lg px-3 py-1.5 text-fg-soft transition hover:bg-surface-2 hover:text-fg">
              {l.label}
            </Link>
          ))}
        </nav>
      </header>

      <div className={`grid gap-6 ${navHidden ? "lg:grid-cols-1" : "lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10"}`}>
        <div className={navHidden ? "lg:hidden" : ""}>
          <button
            type="button"
            onClick={() => setNavOpen((v) => !v)}
            aria-expanded={navOpen}
            className="flex w-full items-center justify-between rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-fg-soft lg:hidden"
          >
            Ordner und Suche
            <ChevronRight aria-hidden className={`h-4 w-4 transition-transform ${navOpen ? "rotate-90" : ""}`} strokeWidth={2} />
          </button>

          <nav
            aria-label="Wiki-Ordner"
            className={`${navOpen ? "mt-3 flex" : "hidden"} flex-col gap-3 lg:sticky lg:top-4 lg:mt-0 lg:flex lg:max-h-[calc(100vh-2rem)]`}
          >
            <div className="flex gap-1.5">
              <div className="relative min-w-0 flex-1">
                <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={2} />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Suchen"
                  aria-label="Wiki durchsuchen"
                  className="w-full rounded-xl border border-line bg-surface py-2 pl-9 pr-3 text-sm text-fg outline-none placeholder:text-muted focus:border-accent"
                />
              </div>
              <button
                type="button"
                onClick={() => setDialog({ kind: "new", parent: null })}
                title="Neuer Ordner"
                aria-label="Neuen Ordner anlegen"
                className="flex w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-fg-soft transition hover:bg-surface-2 hover:text-fg"
              >
                <FolderPlus className="h-4 w-4" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => setNavHidden(true)}
                title="Ordnerleiste ausblenden"
                aria-label="Ordnerleiste ausblenden"
                className="hidden w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-fg-soft transition hover:bg-surface-2 hover:text-fg lg:flex"
              >
                <PanelLeftClose className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>

            <div className="min-h-0 overflow-y-auto rounded-2xl border border-line bg-surface p-2">
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
                  <button type="button" onClick={toggleAll} className="mt-2 w-full rounded-lg px-2 py-1.5 text-left text-xs text-muted transition hover:bg-surface-2 hover:text-fg">
                    {anyOpen ? "Alle zuklappen" : "Alle aufklappen"}
                  </button>
                )}
                {folders.length === 0 && pages.length === 0 && (
                  <p className="px-2 py-1 text-sm text-muted">Noch nichts in {worldName}. Leg den ersten Ordner oder Artikel an.</p>
                )}
              </>
            )}
            </div>
          </nav>
        </div>

        <main className="@container min-w-0">
          {navHidden && (
            <button
              type="button"
              onClick={() => setNavHidden(false)}
              className="mb-4 hidden items-center gap-2 rounded-lg bg-surface-2 px-3 py-1.5 text-sm text-fg-soft transition hover:text-fg lg:flex"
            >
              <PanelLeftOpen className="h-4 w-4" strokeWidth={2} />
              Ordnerleiste einblenden
            </button>
          )}
          {children}
        </main>
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
      <div ref={ref} className={`group relative flex items-center rounded-lg ${active ? "bg-accent/10 shadow-[inset_3px_0_0_var(--accent)]" : "hover:bg-surface-2"}`}>
        {hasContent ? (
          <Chevron open={open} label={`${folder.name} ${open ? "einklappen" : "aufklappen"}`} onClick={() => toggle(folder.id)} />
        ) : (
          <span className="w-6 shrink-0" />
        )}
        <Link
          href={`/wiki/ordner/${folder.id}`}
          onClick={onNavigate}
          className={`flex min-w-0 flex-1 items-center gap-2 py-1.5 text-sm ${active ? "font-semibold text-accent" : "font-medium text-fg"}`}
        >
          {open ? (
            <FolderOpen className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
          ) : (
            <Folder className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
          )}
          <span className="truncate">{folder.name}</span>
        </Link>
        <span className="pr-2 text-xs text-muted group-hover:hidden group-focus-within:hidden">{folder.total}</span>
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
        <ul role="group" className="ml-[19px] border-l border-line pl-1">
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
      <div className={`flex items-center rounded-lg ${active ? "bg-accent/10 shadow-[inset_3px_0_0_var(--accent)]" : "hover:bg-surface-2"}`}>
        {hasKids ? (
          <Chevron open={open} label={`${page.title} ${open ? "einklappen" : "aufklappen"}`} onClick={() => toggle(page.id)} />
        ) : (
          <span className="w-6 shrink-0" />
        )}
        <Link
          href={`/wiki/${page.id}`}
          onClick={onNavigate}
          className={`min-w-0 flex-1 truncate py-1.5 pr-2 text-sm ${active ? "font-semibold text-accent" : "text-fg-soft hover:text-fg"}`}
        >
          {page.title}
        </Link>
      </div>
      {open && (
        <ul role="group" className="ml-[19px] border-l border-line pl-1">
          {page.children.map((c) => (
            <PageNode key={c.id} page={c} depth={depth + 1} {...common} />
          ))}
        </ul>
      )}
    </li>
  );
}
