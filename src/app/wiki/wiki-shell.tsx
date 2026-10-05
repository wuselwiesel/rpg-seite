"use client";

import { WikiTypeIcon } from "@/components/wiki-type-icon";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, ChevronRight, ChevronsDownUp, ChevronsUpDown, Clock, FileText, Folder, FolderPlus, Map as MapIcon, MoreHorizontal, Network, PanelLeftClose, PanelLeftOpen, Search, Settings, Users } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Wordmark } from "@/components/wordmark";
import { WikiWorldMenu } from "./wiki-world-menu";
import { FolderGlyph } from "@/components/folder-glyph";
import { FolderDialog, type FolderDialogState } from "./folder-dialog";
import { useNavHidden, useOpenState } from "./use-open-folders";
import { moveWikiFolder } from "./folder-actions";
import { moveWikiPage } from "./actions";
import {
  buildWikiTree,
  folderPath,
  pageAncestors,
  planMove,
  type DragItem,
  type DropTarget,
  type FolderRow,
  type PageRow,
  type TreeFolder,
  type TreePage,
} from "@/lib/wiki-tree";

type Props = {
  worldId: string;
  worldName: string;
  worlds: { id: string; name: string }[];
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
// Werkzeuge des Wikis: am Laptop als Reiter unter der Kopfzeile, am Handy im aufklappbaren Bereich (ausgeschrieben, nichts wird gekürzt)
const WIKI_TOOLS = [
  { href: "/wiki/karten", label: "Karten", Icon: MapIcon },
  { href: "/wiki/graph", label: "Graph", Icon: Network },
  { href: "/wiki/zeitleiste", label: "Zeitleiste", Icon: Clock },
  { href: "/wiki/kalender", label: "Kalender", Icon: CalendarDays },
  { href: "/characters/relationships", label: "Beziehungen", Icon: Users },
  { href: "/wiki/einstellungen", label: "Einstellungen", title: "Wiki-Einstellungen (Seitenarten)", Icon: Settings },
] as const;

export function WikiShell({ worldId, worldName, worlds, folders, pages, userId, isWorldOwner, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const cur = currentFromPath(pathname);
  const tree = useMemo(() => buildWikiTree(folders, pages), [folders, pages]);
  const { state: stored, save } = useOpenState(worldId);
  const { hidden: navHidden, setHidden: setNavHidden } = useNavHidden();
  const [query, setQuery] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const [dialog, setDialog] = useState<FolderDialogState | null>(null);

  // --- Ziehen und Ablegen: Ordner und Seiten per Maus oder (langes Drücken) per Finger verschieben ---
  const [activeItem, setActiveItem] = useState<DragItem | null>(null);
  const [overTarget, setOverTarget] = useState<DropTarget | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [moving, startMove] = useTransition();
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 8 } }),
  );
  const validFor = useCallback(
    (target: DropTarget) => (activeItem ? planMove(folders, pages, activeItem, target) !== null : false),
    [activeItem, folders, pages],
  );
  const dnd: DndApi = { active: activeItem, validFor };

  const targetOf = (id: unknown): DropTarget | null => {
    const raw = String(id ?? "");
    if (raw === "root") return { kind: "root" };
    const [kind, ...rest] = raw.split(":");
    return kind === "folder" || kind === "page" ? { kind, id: rest.join(":") } : null;
  };
  const onDragStart = (e: DragStartEvent) => {
    setMoveError(null);
    setActiveItem((e.active.data.current as DragItem | undefined) ?? null);
  };
  const onDragOver = (e: DragOverEvent) => setOverTarget(e.over ? targetOf(e.over.id) : null);
  const onDragEnd = (e: DragEndEvent) => {
    const item = activeItem;
    const target = e.over ? targetOf(e.over.id) : null;
    setActiveItem(null);
    setOverTarget(null);
    if (!item || !target) return;
    const plan = planMove(folders, pages, item, target);
    if (!plan) return;
    startMove(async () => {
      const err =
        plan.type === "folder"
          ? await moveWikiFolder(plan.id, plan.parentId)
          : await moveWikiPage(plan.id, plan.folderId, plan.parentPageId);
      setMoveError(err);
    });
  };
  const onDragCancel = () => {
    setActiveItem(null);
    setOverTarget(null);
  };

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

  // Wer lange über einem zugeklappten Ordner verharrt, klappt ihn auf (damit man tiefer ablegen kann).
  useEffect(() => {
    if (!activeItem || overTarget?.kind !== "folder" || !overTarget.id) return;
    const id = overTarget.id;
    if (id in stored ? stored[id] : autoOpen.has(id)) return;
    const timer = setTimeout(() => save({ ...stored, [id]: true }), 700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeItem, overTarget, stored]);

  const q = query.trim().toLowerCase();
  const hits = q
    ? pages.filter((p) => `${p.title} ${p.lead ?? ""}`.toLowerCase().includes(q)).slice(0, 12)
    : [];

  const canDelete = (f: TreeFolder) => f.created_by === userId || isWorldOwner;

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-8 sm:py-10 lg:px-14 xl:px-20 print:max-w-none print:p-0">
      <header className="mb-6 hidden items-center justify-between gap-4 border-b border-line pb-4 lg:flex print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/" aria-label="Wortwinkel" className="block">
            <Wordmark height={36} />
          </Link>
          {worlds.length > 0 && <WikiWorldMenu worlds={worlds} activeId={worldId} />}
        </div>
        <nav aria-label="Zurück in die App" className="flex items-center gap-1 text-sm">
          {[
            { href: "/story", label: "Story" },
            { href: "/profile", label: "Profil" },
          ].map((l) => (
            <Link key={l.href} href={l.href} className="rounded-lg px-3 py-1.5 text-fg-soft transition hover:bg-surface-2 hover:text-fg">
              {l.label}
            </Link>
          ))}
        </nav>
      </header>

      <nav aria-label="Wiki-Werkzeuge" className="-mt-2 mb-6 hidden flex-wrap items-center gap-1 lg:flex print:hidden">
        {WIKI_TOOLS.map((t) => {
          const active = pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              title={"title" in t ? t.title : t.label}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition ${active ? "bg-accent/10 font-medium text-accent" : "text-fg-soft hover:bg-surface-2 hover:text-fg"}`}
            >
              <t.Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
              {t.label}
            </Link>
          );
        })}
      </nav>

      <div className={`grid gap-6 print:block ${navHidden ? "lg:grid-cols-1" : "lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10"}`}>
        <div className={`print:hidden ${navHidden ? "lg:hidden" : ""}`}>
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
                  onKeyDown={(e) => {
                    // Enter öffnet die Suche mit allen Filtern
                    if (e.key === "Enter" && query.trim()) {
                      setNavOpen(false);
                      router.push(`/wiki/suche?q=${encodeURIComponent(query.trim())}`);
                    }
                  }}
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
                className="flex w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-fg-soft transition hover:bg-surface-2 hover:text-fg"
              >
                <FolderPlus className="h-4 w-4" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => setNavHidden(true)}
                title="Ordnerleiste ausblenden"
                aria-label="Ordnerleiste ausblenden"
                className="hidden w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-fg-soft transition hover:bg-surface-2 hover:text-fg lg:flex"
              >
                <PanelLeftClose className="h-4 w-4" strokeWidth={2} />
              </button>
              {folders.length + pages.length > 0 && (
                <button
                  type="button"
                  onClick={toggleAll}
                  title={anyOpen ? "Alle Ordner zuklappen" : "Alle Ordner aufklappen"}
                  aria-label={anyOpen ? "Alle Ordner zuklappen" : "Alle Ordner aufklappen"}
                  className="flex w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-fg-soft transition hover:bg-surface-2 hover:text-fg"
                >
                  {anyOpen ? <ChevronsDownUp className="h-4 w-4" strokeWidth={2} /> : <ChevronsUpDown className="h-4 w-4" strokeWidth={2} />}
                </button>
              )}
            </div>

            <div role="group" aria-label="Wiki-Werkzeuge" className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface p-1 lg:hidden">
              {WIKI_TOOLS.map((t) => {
                const active = pathname.startsWith(t.href);
                return (
                  <Link
                    key={t.href}
                    href={t.href}
                    title={"title" in t ? t.title : t.label}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setNavOpen(false)}
                    className={`flex h-9 items-center gap-2 rounded-lg px-3 text-sm transition ${active ? "bg-accent/10 font-medium text-accent" : "text-fg-soft hover:bg-surface-2 hover:text-fg"}`}
                  >
                    <t.Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                    {t.label}
                  </Link>
                );
              })}
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
                      <span className="flex items-center gap-1.5 font-medium">
                        <WikiTypeIcon type={p.page_type} className="h-3.5 w-3.5 shrink-0 text-muted" />
                        {p.title}
                      </span>
                      <span className="truncate text-xs text-muted">
                        {folderPath(folders, p.folder_id).map((f) => f.name).join(" › ") || "Ohne Ordner"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <>
                <DndContext
                  sensors={sensors}
                  collisionDetection={pointerWithin}
                  onDragStart={onDragStart}
                  onDragOver={onDragOver}
                  onDragEnd={onDragEnd}
                  onDragCancel={onDragCancel}
                >
                {moveError && (
                  <p role="alert" className="mb-2 rounded-lg bg-red-500/10 px-2 py-1.5 text-xs text-red-600 dark:text-red-400">
                    {moveError}{" "}
                    <button type="button" onClick={() => setMoveError(null)} className="underline">
                      OK
                    </button>
                  </p>
                )}
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
                      dnd={dnd}
                    />
                  ))}
                  {tree.loose.length > 0 && (
                    <li className="mt-2 border-t border-line pt-2">
                      <p className="px-2 pb-1 text-xs text-muted">Ohne Ordner</p>
                      <ul>
                        {tree.loose.map((p) => (
                          <PageNode key={p.id} page={p} isOpen={isOpen} toggle={toggle} cur={cur} depth={0} onNavigate={() => setNavOpen(false)} dnd={dnd} />
                        ))}
                      </ul>
                    </li>
                  )}
                </ul>
                {/* Am Ende und am unteren Rand haftend: erscheint, ohne die Zeilen darüber zu verschieben. */}
                {activeItem && (
                  <div className="sticky bottom-0 mt-2 bg-surface pt-1">
                    <RootDropZone dnd={dnd} kind={activeItem.kind} />
                  </div>
                )}
                <DragOverlay dropAnimation={null}>
                  {activeItem && (
                    <div className="flex max-w-[240px] items-center gap-2 rounded-lg border border-accent bg-surface px-3 py-1.5 text-sm font-medium text-fg shadow-lg">
                      {activeItem.kind === "folder" ? (
                        <Folder className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
                      ) : (
                        <FileText className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
                      )}
                      <span className="truncate">
                        {activeItem.kind === "folder"
                          ? folders.find((f) => f.id === activeItem.id)?.name
                          : pages.find((p) => p.id === activeItem.id)?.title}
                      </span>
                    </div>
                  )}
                </DragOverlay>
                </DndContext>
                {moving && <p className="mt-1 px-2 text-xs text-muted">Verschiebe …</p>}
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

type DndApi = { active: DragItem | null; validFor: (t: DropTarget) => boolean };

// Ablagefläche für „oberste Ebene“ / „Ohne Ordner“, nur sichtbar, solange etwas gezogen wird.
function RootDropZone({ dnd, kind }: { dnd: DndApi; kind: "folder" | "page" }) {
  const { setNodeRef, isOver } = useDroppable({ id: "root" });
  const valid = dnd.validFor({ kind: "root" });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border border-dashed px-3 py-2 text-center text-xs transition ${
        isOver && valid ? "border-accent bg-accent/10 text-accent" : valid ? "border-line text-muted" : "border-line/50 text-muted/50"
      }`}
    >
      {kind === "folder" ? "Hierher ziehen: oberste Ebene" : "Hierher ziehen: ohne Ordner"}
    </div>
  );
}

// Zeile im Baum als Zieh-Quelle und Ablageziel zugleich.
function useRowDnd(item: DragItem, dnd: DndApi) {
  const drag = useDraggable({ id: `${item.kind}:${item.id}`, data: item });
  const drop = useDroppable({ id: `${item.kind}:${item.id}` });
  const { setNodeRef: setDrag } = drag;
  const { setNodeRef: setDrop } = drop;
  const setRef = useCallback(
    (el: HTMLElement | null) => {
      setDrag(el);
      setDrop(el);
    },
    [setDrag, setDrop],
  );
  const over = drop.isOver && dnd.validFor({ kind: item.kind, id: item.id });
  return { setRef, listeners: drag.listeners, dragging: drag.isDragging, over };
}

type NodeCommon = {
  dnd: DndApi;
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
  const { isOpen, toggle, cur, onNavigate, dnd } = common;
  const { setRef: setRowRef, listeners: rowListeners, dragging, over } = useRowDnd({ kind: "folder", id: folder.id }, dnd);
  const hasContent = folder.children.length + folder.pages.length > 0;
  const open = isOpen(folder.id) && hasContent;
  const active = cur.folder === folder.id;
  const [menu, setMenu] = useState(false);
  // Das Menü sitzt fest am Bildschirm (nicht im scrollenden Baum, sonst wird es abgeschnitten) und klappt nach oben, wenn unten kein Platz ist.
  const [menuPos, setMenuPos] = useState<{ left: number; top?: number; bottom?: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  function toggleMenu() {
    if (menu) return setMenu(false);
    const r = menuButtonRef.current?.getBoundingClientRect();
    if (r) {
      const width = 208;
      const needed = 230;
      const left = Math.max(8, Math.min(r.right - width, window.innerWidth - width - 8));
      setMenuPos(window.innerHeight - r.bottom >= needed || window.innerHeight - r.bottom >= r.top ? { left, top: r.bottom + 4 } : { left, bottom: window.innerHeight - r.top + 4 });
    }
    setMenu(true);
  }

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setMenu(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    const close = () => setMenu(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    // Das Menü steht fest am Bildschirm: beim Scrollen oder Ändern der Größe schließen
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [menu]);

  const item = "block w-full px-3 py-1.5 text-left text-sm text-fg transition hover:bg-surface-2";

  return (
    <li role="treeitem" aria-selected={active} aria-expanded={hasContent ? open : undefined}>
      <div
        ref={(el) => {
          ref.current = el;
          setRowRef(el);
        }}
        {...rowListeners}
        style={{ touchAction: "manipulation" }}
        className={`group relative flex items-center rounded-lg ${dragging ? "opacity-40" : ""} ${
          over ? "bg-accent/15 ring-2 ring-accent" : active ? "bg-accent/10 shadow-[inset_3px_0_0_var(--accent)]" : "hover:bg-surface-2"
        }`}
      >
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
          <FolderGlyph icon={folder.icon} color={folder.color} open={open} textClass="text-base" />
          <span className="truncate">{folder.name}</span>
        </Link>
        <span className="pr-2 text-xs text-muted group-hover:hidden group-focus-within:hidden">{folder.total}</span>
        <button
          ref={menuButtonRef}
          type="button"
          onClick={toggleMenu}
          aria-haspopup="menu"
          aria-expanded={menu}
          aria-label={`Menü für ${folder.name}`}
          className="hidden h-8 w-8 shrink-0 items-center justify-center rounded text-muted hover:text-fg group-hover:flex group-focus-within:flex"
        >
          <MoreHorizontal className="h-4 w-4" strokeWidth={2} />
        </button>
        {menu && (
          <div role="menu" style={menuPos ?? undefined} className="fixed z-50 w-52 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-lg">
            <Link role="menuitem" href={`/wiki/new?folder=${folder.id}`} onClick={() => { setMenu(false); onNavigate(); }} className={item}>
              Artikel hier anlegen
            </Link>
            <button role="menuitem" type="button" className={item} onClick={() => { setMenu(false); onDialog({ kind: "new", parent: folder }); }}>
              Unterordner anlegen
            </button>
            <button role="menuitem" type="button" className={item} onClick={() => { setMenu(false); onDialog({ kind: "rename", folder }); }}>
              Bearbeiten
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
  const { isOpen, toggle, cur, onNavigate, dnd } = common;
  const { setRef: setRowRef, listeners: rowListeners, dragging, over } = useRowDnd({ kind: "page", id: page.id }, dnd);
  const hasKids = page.children.length > 0;
  const open = isOpen(page.id) && hasKids;
  const active = cur.page === page.id;
  return (
    <li role="treeitem" aria-selected={active} aria-expanded={hasKids ? open : undefined}>
      <div
        ref={setRowRef}
        {...rowListeners}
        style={{ touchAction: "manipulation" }}
        className={`flex items-center rounded-lg ${dragging ? "opacity-40" : ""} ${
          over ? "bg-accent/15 ring-2 ring-accent" : active ? "bg-accent/10 shadow-[inset_3px_0_0_var(--accent)]" : "hover:bg-surface-2"
        }`}
      >
        {hasKids ? (
          <Chevron open={open} label={`${page.title} ${open ? "einklappen" : "aufklappen"}`} onClick={() => toggle(page.id)} />
        ) : (
          <span className="w-6 shrink-0" />
        )}
        <Link
          href={`/wiki/${page.id}`}
          onClick={onNavigate}
          className={`flex min-w-0 flex-1 items-center gap-1.5 py-1.5 pr-2 text-sm ${active ? "font-semibold text-accent" : "text-fg-soft hover:text-fg"}`}
        >
          <WikiTypeIcon type={page.page_type} className="h-3.5 w-3.5 shrink-0 text-muted" />
          <span className="truncate">{page.title}</span>
          {page.is_draft && <span className="shrink-0 rounded bg-accent/10 px-1.5 text-[10px] text-accent">Entwurf</span>}
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
