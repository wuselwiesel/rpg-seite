// Ordner- und Seitenbaum des Wikis: Ordner enthalten Unterordner und Seiten, Seiten können Unterseiten haben.

export type FolderRow = {
  id: string;
  parent_id: string | null;
  name: string;
  created_by: string | null;
  icon?: string | null;
  color?: string | null;
};
export type PageRow = {
  id: string;
  title: string;
  folder_id: string | null;
  parent_page_id: string | null;
  lead?: string | null;
  page_type?: string | null;
  tags?: string[] | null;
  event_label?: string | null;
  event_end_label?: string | null;
  event_year?: number | null;
  event_month?: number | null;
  event_day?: number | null;
  event_end_year?: number | null;
  event_end_month?: number | null;
  event_end_day?: number | null;
  is_draft?: boolean;
  created_at?: string;
  cover_image_url?: string | null;
  icon_url?: string | null;
  updated_at?: string;
  created_by?: string | null;
  // Ereignis aus einer Story-Nachricht
  source_entry_id?: string | null;
  source_story_id?: string | null;
};

export type TreePage = PageRow & { children: TreePage[] };
export type TreeFolder = FolderRow & { children: TreeFolder[]; pages: TreePage[]; total: number };

const byTitle = (a: { title: string }, b: { title: string }) => a.title.localeCompare(b.title, "de");
const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "de");

// Seiten mit vorhandener Oberseite hängen darunter (egal in welchem Ordner); alle anderen im eigenen Ordner oder lose.
export function buildWikiTree(folders: FolderRow[], pages: PageRow[]): { folders: TreeFolder[]; loose: TreePage[] } {
  const pageById = new Map<string, TreePage>(pages.map((p) => [p.id, { ...p, children: [] }]));
  const rootPages: TreePage[] = [];
  for (const p of pageById.values()) {
    const parent = p.parent_page_id ? pageById.get(p.parent_page_id) : undefined;
    if (parent) parent.children.push(p);
    else rootPages.push(p);
  }
  for (const p of pageById.values()) p.children.sort(byTitle);

  const folderById = new Map<string, TreeFolder>(folders.map((f) => [f.id, { ...f, children: [], pages: [], total: 0 }]));
  const rootFolders: TreeFolder[] = [];
  for (const f of folderById.values()) {
    const parent = f.parent_id ? folderById.get(f.parent_id) : undefined;
    if (parent) parent.children.push(f);
    else rootFolders.push(f);
  }
  const loose: TreePage[] = [];
  for (const p of rootPages) {
    const folder = p.folder_id ? folderById.get(p.folder_id) : undefined;
    if (folder) folder.pages.push(p);
    else loose.push(p);
  }
  const countPages = (p: TreePage): number => 1 + p.children.reduce((n, c) => n + countPages(c), 0);
  const finish = (f: TreeFolder): number => {
    f.children.sort(byName);
    f.pages.sort(byTitle);
    f.total = f.pages.reduce((n, p) => n + countPages(p), 0) + f.children.reduce((n, c) => n + finish(c), 0);
    return f.total;
  };
  rootFolders.sort(byName);
  rootFolders.forEach(finish);
  loose.sort(byTitle);
  return { folders: rootFolders, loose };
}

export function findFolder(folders: TreeFolder[], id: string): TreeFolder | null {
  for (const f of folders) {
    if (f.id === id) return f;
    const hit = findFolder(f.children, id);
    if (hit) return hit;
  }
  return null;
}

// Pfad von der obersten Ebene bis zum Ordner (einschließlich).
export function folderPath(folders: FolderRow[], id: string | null): FolderRow[] {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const path: FolderRow[] = [];
  const seen = new Set<string>();
  let cur = id ? byId.get(id) : undefined;
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    path.unshift(cur);
    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
  }
  return path;
}

// Oberseiten einer Seite, von der obersten bis zur direkten (ohne die Seite selbst).
export function pageAncestors(pages: PageRow[], id: string): PageRow[] {
  const byId = new Map(pages.map((p) => [p.id, p]));
  const out: PageRow[] = [];
  const seen = new Set<string>([id]);
  let cur = byId.get(id)?.parent_page_id ? byId.get(byId.get(id)!.parent_page_id!) : undefined;
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    out.unshift(cur);
    cur = cur.parent_page_id ? byId.get(cur.parent_page_id) : undefined;
  }
  return out;
}

// Ordner samt aller darunterliegenden Ordner (für „nicht in sich selbst verschieben“).
export function folderSubtreeIds(folders: FolderRow[], id: string): Set<string> {
  const out = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const f of folders) {
      if (f.parent_id && out.has(f.parent_id) && !out.has(f.id)) {
        out.add(f.id);
        grew = true;
      }
    }
  }
  return out;
}

export function pageSubtreeIds(pages: PageRow[], id: string): Set<string> {
  const out = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const p of pages) {
      if (p.parent_page_id && out.has(p.parent_page_id) && !out.has(p.id)) {
        out.add(p.id);
        grew = true;
      }
    }
  }
  return out;
}

export type FolderOption = { id: string; label: string; depth: number };

// Flache Liste für Auswahlfelder: "Spezies", "Spezies › Übernatürlich" …
export function folderOptions(tree: TreeFolder[], exclude?: Set<string>): FolderOption[] {
  const out: FolderOption[] = [];
  const walk = (list: TreeFolder[], trail: string[]) => {
    for (const f of list) {
      if (exclude?.has(f.id)) continue;
      const names = [...trail, f.name];
      out.push({ id: f.id, label: names.join(" › "), depth: trail.length });
      walk(f.children, names);
    }
  };
  walk(tree, []);
  return out;
}

export type PageOption = { id: string; label: string };

// Alle Seiten für die Wahl einer Oberseite, mit Pfad; `exclude` nimmt die Seite selbst und ihre Unterseiten heraus.
export function pageOptions(tree: { folders: TreeFolder[]; loose: TreePage[] }, exclude?: Set<string>): PageOption[] {
  const out: PageOption[] = [];
  const addPage = (p: TreePage, trail: string[]) => {
    if (exclude?.has(p.id)) return;
    const names = [...trail, p.title];
    out.push({ id: p.id, label: names.join(" › ") });
    p.children.forEach((c) => addPage(c, names));
  };
  const walk = (list: TreeFolder[], trail: string[]) => {
    for (const f of list) {
      const names = [...trail, f.name];
      f.pages.forEach((p) => addPage(p, names));
      walk(f.children, names);
    }
  };
  walk(tree.folders, []);
  tree.loose.forEach((p) => addPage(p, []));
  return out;
}

// --- Ziehen und Ablegen in der Seitenleiste ---

export type DragItem = { kind: "folder" | "page"; id: string };
export type DropTarget = { kind: "folder" | "page" | "root"; id?: string };

// Was beim Ablegen passiert: ein Ordner bekommt einen neuen Oberordner, eine Seite einen neuen Ordner und/oder eine Oberseite.
export type MovePlan =
  | { type: "folder"; id: string; parentId: string | null }
  | { type: "page"; id: string; folderId: string | null; parentPageId: string | null };

// Ergebnis des Ablegens oder null, wenn es nicht erlaubt ist oder nichts ändern würde.
//  - Ordner → Ordner/oberste Ebene (nie in sich selbst oder einen eigenen Unterordner), nie auf eine Seite.
//  - Seite → Ordner (wird Seite dieses Ordners), → Seite (wird Unterseite, nie unter sich selbst oder eine eigene Unterseite),
//    → oberste Ebene ("Ohne Ordner").
export function planMove(folders: FolderRow[], pages: PageRow[], item: DragItem, target: DropTarget): MovePlan | null {
  if (item.kind === "folder") {
    const folder = folders.find((f) => f.id === item.id);
    if (!folder) return null;
    if (target.kind === "page") return null;
    const parentId = target.kind === "root" ? null : (target.id ?? null);
    if (target.kind === "folder") {
      if (!target.id || !folders.some((f) => f.id === target.id)) return null;
      if (folderSubtreeIds(folders, item.id).has(target.id)) return null;
    }
    if ((folder.parent_id ?? null) === parentId) return null;
    return { type: "folder", id: item.id, parentId };
  }

  const page = pages.find((p) => p.id === item.id);
  if (!page) return null;
  if (target.kind === "root") {
    if (!page.folder_id && !page.parent_page_id) return null;
    return { type: "page", id: item.id, folderId: null, parentPageId: null };
  }
  if (target.kind === "folder") {
    if (!target.id || !folders.some((f) => f.id === target.id)) return null;
    if (page.folder_id === target.id && !page.parent_page_id) return null;
    return { type: "page", id: item.id, folderId: target.id, parentPageId: null };
  }
  const parent = pages.find((p) => p.id === target.id);
  if (!parent || pageSubtreeIds(pages, item.id).has(parent.id)) return null;
  if (page.parent_page_id === parent.id) return null;
  return { type: "page", id: item.id, folderId: parent.folder_id, parentPageId: parent.id };
}
