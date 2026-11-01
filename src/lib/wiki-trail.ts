// Pfad zur aktuellen Wiki-Seite für die Kopfzeile: Wiki › Ordner › Unterordner › Oberseite › Seite.
import { folderPath, pageAncestors, type FolderRow, type PageRow } from "@/lib/wiki-tree";

export type TrailItem = { label: string; href: string | null };

const STATIC_LABELS: Record<string, string> = {
  uebersicht: "Übersicht",
  karten: "Karten",
  graph: "Graph",
  zeitleiste: "Zeitleiste",
  kalender: "Kalender",
  besetzung: "Besetzung",
  figuren: "Figuren",
  einstellungen: "Einstellungen",
  suche: "Suche",
  new: "Neuer Artikel",
};

const UUID = /^[0-9a-f-]{36}$/;

// Letzter Eintrag ist die aktuelle Seite (ohne Link); „Wiki“ führt immer auf die Startseite.
export function wikiTrail(pathname: string, folders: FolderRow[], pages: PageRow[]): TrailItem[] {
  const parts = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  const home: TrailItem = { label: "Wiki", href: "/wiki" };
  if (parts[0] !== "wiki" || parts.length === 1) return [{ ...home, href: null }];

  const crumbs: TrailItem[] = [home];
  const [, first, second] = parts;

  if (first === "ordner" && UUID.test(second ?? "")) {
    const path = folderPath(folders, second);
    path.forEach((f, i) => crumbs.push({ label: f.name, href: i === path.length - 1 ? null : `/wiki/ordner/${f.id}` }));
    return crumbs.length > 1 ? crumbs : [...crumbs, { label: "Ordner", href: null }];
  }

  if (UUID.test(first)) {
    const page = pages.find((p) => p.id === first);
    const sub = second === "edit" ? "Bearbeiten" : second === "verlauf" ? "Verlauf" : null;
    if (page) {
      for (const f of folderPath(folders, page.folder_id)) crumbs.push({ label: f.name, href: `/wiki/ordner/${f.id}` });
      for (const p of pageAncestors(pages, page.id)) crumbs.push({ label: p.title, href: `/wiki/${p.id}` });
    }
    crumbs.push({ label: page?.title ?? "Seite", href: sub ? `/wiki/${first}` : null });
    if (sub) crumbs.push({ label: sub, href: null });
    return crumbs;
  }

  const label = STATIC_LABELS[first];
  if (!label) return [{ ...home, href: null }];
  if (first === "karten" && second) {
    crumbs.push({ label, href: "/wiki/karten" }, { label: "Karte", href: null });
  } else {
    crumbs.push({ label, href: null });
  }
  return crumbs;
}

// Lange Pfade: erster und die letzten Einträge bleiben, dazwischen steht „…“ (mit dem vollen Pfad als Hinweis).
export function collapseTrail(items: TrailItem[], max = 4): (TrailItem & { hint?: string })[] {
  if (items.length <= max) return items;
  const tail = items.slice(items.length - (max - 2));
  const hidden = items.slice(1, items.length - (max - 2));
  return [items[0], { label: "…", href: null, hint: hidden.map((i) => i.label).join(" › ") }, ...tail];
}
