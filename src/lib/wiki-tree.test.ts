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
