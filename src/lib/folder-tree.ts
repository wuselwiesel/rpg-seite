// Ordnerbäume (höchstens drei Ebenen) für Notizen und Szenen: nur Namen und Verweise auf den Oberordner
export type FolderLike = { id: string; name: string; parentId: string | null };

export const MAX_FOLDER_DEPTH = 3;

const byFolderName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "de");

export type FolderNode = FolderLike & { depth: number; children: FolderNode[] };

export function buildFolderTree(folders: FolderLike[]): FolderNode[] {
  const nodes = new Map<string, FolderNode>(folders.map((f) => [f.id, { ...f, depth: 1, children: [] }]));
  const roots: FolderNode[] = [];
  for (const n of nodes.values()) {
    const parent = n.parentId ? nodes.get(n.parentId) : undefined;
    if (parent) parent.children.push(n);
    else roots.push(n);
  }
  const walk = (list: FolderNode[], depth: number) => {
    list.sort(byFolderName);
    for (const n of list) {
      n.depth = depth;
      walk(n.children, depth + 1);
    }
  };
  walk(roots, 1);
  return roots;
}

// Alle Ordner in Baumreihenfolge (Elternordner vor ihren Unterordnern), z. B. für Auswahlfelder
export function flattenFolders(folders: FolderLike[]): FolderNode[] {
  const out: FolderNode[] = [];
  const walk = (list: FolderNode[]) => {
    for (const n of list) {
      out.push(n);
      walk(n.children);
    }
  };
  walk(buildFolderTree(folders));
  return out;
}

// Kette vom obersten Ordner bis zu diesem
export function folderPath(folders: FolderLike[], id: string): FolderLike[] {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const path: FolderLike[] = [];
  const seen = new Set<string>();
  let cur = byId.get(id);
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    path.unshift(cur);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return path;
}

// Der Ordner selbst und alles darunter
export function descendantIds(folders: FolderLike[], id: string): Set<string> {
  const out = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const f of folders) {
      if (f.parentId && out.has(f.parentId) && !out.has(f.id)) {
        out.add(f.id);
        grew = true;
      }
    }
  }
  return out;
}

// Tiefe des tiefsten Unterordners unter diesem Ordner (1 = nur er selbst)
export function subtreeHeight(folders: FolderLike[], id: string): number {
  const ids = descendantIds(folders, id);
  return Math.max(...[...ids].map((x) => folderPath(folders, x).length - folderPath(folders, id).length + 1));
}

// Darf der Ordner unter „parentId“ (null = oberste Ebene) liegen? Kein Kreis, höchstens MAX_FOLDER_DEPTH Ebenen
export function canMoveFolder(folders: FolderLike[], id: string, parentId: string | null): boolean {
  if (parentId === id) return false;
  if (parentId && descendantIds(folders, id).has(parentId)) return false;
  const parentDepth = parentId ? folderPath(folders, parentId).length : 0;
  return parentDepth + subtreeHeight(folders, id) <= MAX_FOLDER_DEPTH;
}
