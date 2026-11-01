import { describe, expect, it } from "vitest";
import { collapseTrail, wikiTrail } from "./wiki-trail";
import type { FolderRow, PageRow } from "./wiki-tree";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const folders: FolderRow[] = [
  { id: id(1), parent_id: null, name: "Orte", created_by: null },
  { id: id(2), parent_id: id(1), name: "Städte", created_by: null },
];
const pages: PageRow[] = [
  { id: id(10), title: "Nebelhafen", folder_id: id(2), parent_page_id: null },
  { id: id(11), title: "Hafenmeisterei", folder_id: id(2), parent_page_id: id(10) },
  { id: id(12), title: "Lose Seite", folder_id: null, parent_page_id: null },
];

describe("wikiTrail", () => {
  it("Startseite ist nur „Wiki“ ohne Link", () => {
    expect(wikiTrail("/wiki", folders, pages)).toEqual([{ label: "Wiki", href: null }]);
  });

  it("Ordner: Wiki › Ordnerpfad, der aktuelle ohne Link", () => {
    expect(wikiTrail(`/wiki/ordner/${id(2)}`, folders, pages)).toEqual([
      { label: "Wiki", href: "/wiki" },
      { label: "Orte", href: `/wiki/ordner/${id(1)}` },
      { label: "Städte", href: null },
    ]);
  });

  it("Unterseite: Ordner, Oberseite, dann die Seite selbst", () => {
    expect(wikiTrail(`/wiki/${id(11)}`, folders, pages).map((c) => c.label)).toEqual(["Wiki", "Orte", "Städte", "Nebelhafen", "Hafenmeisterei"]);
    expect(wikiTrail(`/wiki/${id(11)}`, folders, pages).at(-1)?.href).toBeNull();
  });

  it("lose Seite hat keinen Ordner", () => {
    expect(wikiTrail(`/wiki/${id(12)}`, folders, pages).map((c) => c.label)).toEqual(["Wiki", "Lose Seite"]);
  });

  it("Bearbeiten und Verlauf hängen sich hinter die Seite, die Seite wird verlinkt", () => {
    const edit = wikiTrail(`/wiki/${id(10)}/edit`, folders, pages);
    expect(edit.map((c) => c.label)).toEqual(["Wiki", "Orte", "Städte", "Nebelhafen", "Bearbeiten"]);
    expect(edit.at(-2)?.href).toBe(`/wiki/${id(10)}`);
    expect(wikiTrail(`/wiki/${id(10)}/verlauf`, folders, pages).at(-1)?.label).toBe("Verlauf");
  });

  it("unbekannte Seite fällt auf „Seite“ zurück", () => {
    expect(wikiTrail(`/wiki/${id(99)}`, folders, pages).map((c) => c.label)).toEqual(["Wiki", "Seite"]);
  });

  it("feste Seiten", () => {
    expect(wikiTrail("/wiki/besetzung", folders, pages)).toEqual([{ label: "Wiki", href: "/wiki" }, { label: "Besetzung", href: null }]);
    expect(wikiTrail("/wiki/new", folders, pages).at(-1)?.label).toBe("Neuer Artikel");
    expect(wikiTrail("/wiki/karten/abc", folders, pages)).toEqual([
      { label: "Wiki", href: "/wiki" },
      { label: "Karten", href: "/wiki/karten" },
      { label: "Karte", href: null },
    ]);
  });

  it("unbekannte Adresse zeigt nur „Wiki“", () => {
    expect(wikiTrail("/wiki/zufall", folders, pages)).toEqual([{ label: "Wiki", href: null }]);
  });
});

describe("collapseTrail", () => {
  const items = ["Wiki", "A", "B", "C", "D", "E"].map((label, i) => ({ label, href: i === 5 ? null : `/${label}` }));

  it("kurze Pfade bleiben", () => {
    expect(collapseTrail(items.slice(0, 4))).toHaveLength(4);
  });

  it("lange Pfade: Anfang, „…“ mit Hinweis, letzte zwei", () => {
    const out = collapseTrail(items);
    expect(out.map((c) => c.label)).toEqual(["Wiki", "…", "D", "E"]);
    expect(out[1].hint).toBe("A › B › C");
    expect(out[1].href).toBeNull();
  });
});
