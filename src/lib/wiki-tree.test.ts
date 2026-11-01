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
  planReorder,
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

describe("Eigene Reihenfolge", () => {
  const fs = [folder("a", "Alpha"), folder("b", "Beta"), folder("c", "Gamma"), folder("sub", "Unter", "a")];
  const ps = [page("p1", "Anna", null), page("p2", "Berta", null), page("p3", "Cora", null), page("q1", "Dora", "a"), page("q2", "Emil", "a"), page("k", "Kind", "a", "q1")];

  it("ohne gespeicherte Reihenfolge alphabetisch", () => {
    const tree = buildWikiTree(fs, ps);
    expect(tree.folders.map((f) => f.id)).toEqual(["a", "b", "c"]);
    expect(tree.loose.map((p) => p.id)).toEqual(["p1", "p2", "p3"]);
  });

  it("gespeicherte Reihenfolge gilt je Ebene, Neues steht alphabetisch dahinter", () => {
    const tree = buildWikiTree(fs, ps, { root: ["c", "a", "p3", "p1"], "folder:a": ["q2", "q1"] });
    expect(tree.folders.map((f) => f.id)).toEqual(["c", "a", "b"]);
    expect(tree.loose.map((p) => p.id)).toEqual(["p3", "p1", "p2"]);
    expect(findFolder(tree.folders, "a")!.pages.map((p) => p.id)).toEqual(["q2", "q1"]);
  });

  it("Ids, die es nicht mehr gibt, stören nicht", () => {
    const tree = buildWikiTree(fs, ps, { root: ["gone", "b"] });
    expect(tree.folders.map((f) => f.id)).toEqual(["b", "a", "c"]);
  });

  describe("planReorder", () => {
    const tree = buildWikiTree(fs, ps);
    const reorder = (item: { kind: "folder" | "page"; id: string }, id: string, position: "before" | "after") => planReorder(tree, fs, ps, item, { kind: item.kind, id, position });

    it("Ordner hinter einen anderen Ordner schieben", () => {
      expect(reorder({ kind: "folder", id: "a" }, "c", "after")).toEqual({ move: null, container: "root", ids: ["b", "c", "a", "p1", "p2", "p3"] });
    });

    it("Seite vor eine andere Seite derselben Ebene", () => {
      expect(reorder({ kind: "page", id: "p3" }, "p1", "before")).toEqual({ move: null, container: "root", ids: ["a", "b", "c", "p3", "p1", "p2"] });
    });

    it("an der Stelle, wo er schon steht, passiert nichts", () => {
      expect(reorder({ kind: "page", id: "p2" }, "p1", "after")).toBeNull();
      expect(reorder({ kind: "folder", id: "b" }, "c", "before")).toBeNull();
    });

    it("zwischen Seiten eines anderen Ordners: zieht um und steht dort an der Stelle", () => {
      const plan = reorder({ kind: "page", id: "p1" }, "q2", "before");
      expect(plan?.move).toEqual({ type: "page", id: "p1", folderId: "a", parentPageId: null });
      expect(plan?.container).toBe("folder:a");
      expect(plan?.ids).toEqual(["sub", "q1", "p1", "q2"]);
    });

    it("Ordner nie in den eigenen Unterordner, Ordner nur zwischen Ordnern", () => {
      expect(reorder({ kind: "folder", id: "a" }, "sub", "after")).toBeNull();
      expect(planReorder(tree, fs, ps, { kind: "folder", id: "a" }, { kind: "page", id: "p1", position: "after" })).toBeNull();
    });

    it("Unterseite einer Seite wird Geschwister einer anderen Unterseite", () => {
      const plan = reorder({ kind: "page", id: "q2" }, "k", "after");
      expect(plan?.move).toEqual({ type: "page", id: "q2", folderId: "a", parentPageId: "q1" });
      expect(plan?.container).toBe("page:q1");
      expect(plan?.ids).toEqual(["k", "q2"]);
    });

    it("Seite nie unter sich selbst oder die eigene Unterseite", () => {
      expect(reorder({ kind: "page", id: "q1" }, "k", "after")).toBeNull();
    });
  });
});
