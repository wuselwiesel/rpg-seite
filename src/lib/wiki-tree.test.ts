import { describe, expect, it } from "vitest";
import {
  buildWikiTree,
  findFolder,
  folderOptions,
  folderPath,
  folderSubtreeIds,
  pageAncestors,
  pageOptions,
  pageSubtreeIds,
  planMove,
  type FolderRow,
  type PageRow,
} from "./wiki-tree";

const folder = (id: string, name: string, parent: string | null = null): FolderRow => ({ id, name, parent_id: parent, created_by: "u" });
const page = (id: string, title: string, folderId: string | null, parent: string | null = null): PageRow => ({
  id,
  title,
  folder_id: folderId,
  parent_page_id: parent,
});

const folders = [folder("spezies", "Spezies"), folder("uebern", "Übernatürlich", "spezies"), folder("orte", "Orte")];
const pages = [
  page("vamp", "Vampire", "uebern"),
  page("sire", "Sireline", "uebern", "vamp"),
  page("orig", "Original", "uebern", "sire"),
  page("hexe", "Hexen", "spezies"),
  page("haus", "Haus", "orte"),
  page("lose", "Lose Seite", null),
];

describe("Wiki-Baum", () => {
  const tree = buildWikiTree(folders, pages);

  it("hängt Unterordner, Seiten und Unterseiten an die richtige Stelle", () => {
    const spezies = findFolder(tree.folders, "spezies")!;
    expect(spezies.children.map((c) => c.id)).toEqual(["uebern"]);
    expect(spezies.pages.map((p) => p.id)).toEqual(["hexe"]);
    const vamp = findFolder(tree.folders, "uebern")!.pages[0];
    expect(vamp.id).toBe("vamp");
    expect(vamp.children[0].id).toBe("sire");
    expect(vamp.children[0].children[0].id).toBe("orig");
  });

  it("zählt Seiten samt Unterseiten und Unterordnern", () => {
    expect(findFolder(tree.folders, "uebern")!.total).toBe(3);
    expect(findFolder(tree.folders, "spezies")!.total).toBe(4);
  });

  it("stellt Seiten ohne Ordner als lose Seiten dar", () => {
    expect(tree.loose.map((p) => p.id)).toEqual(["lose"]);
  });

  it("zeigt eine Unterseite unter ihrer Oberseite, auch wenn deren Oberseite fehlt, auf oberster Ebene des Ordners", () => {
    const t = buildWikiTree(folders, [page("x", "X", "orte", "gibt-es-nicht")]);
    expect(findFolder(t.folders, "orte")!.pages.map((p) => p.id)).toEqual(["x"]);
  });

  it("liefert Pfade", () => {
    expect(folderPath(folders, "uebern").map((f) => f.name)).toEqual(["Spezies", "Übernatürlich"]);
    expect(folderPath(folders, null)).toEqual([]);
    expect(pageAncestors(pages, "orig").map((p) => p.id)).toEqual(["vamp", "sire"]);
    expect(pageAncestors(pages, "vamp")).toEqual([]);
  });

  it("findet Unterbäume, damit nichts in sich selbst verschoben wird", () => {
    expect([...folderSubtreeIds(folders, "spezies")].sort()).toEqual(["spezies", "uebern"]);
    expect([...pageSubtreeIds(pages, "vamp")].sort()).toEqual(["orig", "sire", "vamp"]);
  });

  it("baut Auswahllisten mit Pfad und lässt Ausgeschlossene weg", () => {
    expect(folderOptions(tree.folders).map((o) => o.label)).toEqual(["Orte", "Spezies", "Spezies › Übernatürlich"]);
    expect(folderOptions(tree.folders, folderSubtreeIds(folders, "spezies")).map((o) => o.id)).toEqual(["orte"]);
    const opts = pageOptions(tree, pageSubtreeIds(pages, "vamp")).map((o) => o.id);
    expect(opts).toContain("hexe");
    expect(opts).not.toContain("sire");
  });

  it("übersteht kaputte Kreise im Pfad", () => {
    const loop = [folder("a", "A", "b"), folder("b", "B", "a")];
    expect(folderPath(loop, "a").length).toBeLessThanOrEqual(2);
  });
});

describe("planMove (Ziehen und Ablegen)", () => {
  const folders: FolderRow[] = [
    { id: "f1", parent_id: null, name: "Orte", created_by: "u" },
    { id: "f2", parent_id: "f1", name: "Städte", created_by: "u" },
    { id: "f3", parent_id: "f2", name: "Häfen", created_by: "u" },
    { id: "f4", parent_id: null, name: "NPCs", created_by: "u" },
  ];
  const pages: PageRow[] = [
    { id: "p1", title: "Nebelhafen", folder_id: "f2", parent_page_id: null },
    { id: "p2", title: "Hafenviertel", folder_id: "f2", parent_page_id: "p1" },
    { id: "p3", title: "Hafenmeister", folder_id: "f2", parent_page_id: "p2" },
    { id: "p4", title: "Lose Seite", folder_id: null, parent_page_id: null },
  ];
  const move = (item: Parameters<typeof planMove>[2], target: Parameters<typeof planMove>[3]) => planMove(folders, pages, item, target);

  it("Ordner in einen anderen Ordner oder nach oben", () => {
    expect(move({ kind: "folder", id: "f3" }, { kind: "folder", id: "f4" })).toEqual({ type: "folder", id: "f3", parentId: "f4" });
    expect(move({ kind: "folder", id: "f3" }, { kind: "root" })).toEqual({ type: "folder", id: "f3", parentId: null });
  });

  it("Ordner nie in sich selbst, in einen eigenen Unterordner oder auf eine Seite", () => {
    expect(move({ kind: "folder", id: "f1" }, { kind: "folder", id: "f1" })).toBeNull();
    expect(move({ kind: "folder", id: "f1" }, { kind: "folder", id: "f3" })).toBeNull();
    expect(move({ kind: "folder", id: "f2" }, { kind: "page", id: "p1" })).toBeNull();
  });

  it("ändert nichts, wenn der Ordner schon dort liegt", () => {
    expect(move({ kind: "folder", id: "f2" }, { kind: "folder", id: "f1" })).toBeNull();
    expect(move({ kind: "folder", id: "f4" }, { kind: "root" })).toBeNull();
  });

  it("Seite in einen Ordner: wird Seite des Ordners, nicht mehr Unterseite", () => {
    expect(move({ kind: "page", id: "p2" }, { kind: "folder", id: "f4" })).toEqual({ type: "page", id: "p2", folderId: "f4", parentPageId: null });
    expect(move({ kind: "page", id: "p1" }, { kind: "folder", id: "f2" })).toBeNull();
  });

  it("Seite auf eine Seite: wird Unterseite im Ordner der Oberseite", () => {
    expect(move({ kind: "page", id: "p4" }, { kind: "page", id: "p1" })).toEqual({ type: "page", id: "p4", folderId: "f2", parentPageId: "p1" });
  });

  it("Seite nie unter sich selbst oder eine eigene Unterseite", () => {
    expect(move({ kind: "page", id: "p1" }, { kind: "page", id: "p1" })).toBeNull();
    expect(move({ kind: "page", id: "p1" }, { kind: "page", id: "p3" })).toBeNull();
    expect(move({ kind: "page", id: "p2" }, { kind: "page", id: "p1" })).toBeNull(); // schon Unterseite davon
  });

  it("Seite auf die oberste Ebene: ohne Ordner und ohne Oberseite", () => {
    expect(move({ kind: "page", id: "p2" }, { kind: "root" })).toEqual({ type: "page", id: "p2", folderId: null, parentPageId: null });
    expect(move({ kind: "page", id: "p4" }, { kind: "root" })).toBeNull();
  });
});
