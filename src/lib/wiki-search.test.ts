import { describe, expect, it } from "vitest";
import { searchWiki, type SearchEntry } from "./wiki-search";

const folders = [
  { id: "f1", parent_id: null, name: "Orte", created_by: "u" },
  { id: "f2", parent_id: "f1", name: "Städte", created_by: "u" },
  { id: "f3", parent_id: null, name: "Wesen", created_by: "u" },
];
const entries: SearchEntry[] = [
  { id: "1", title: "Nebelhafen", text: "Eine Hafenstadt im Norden.", page_type: "ort", tags: ["Küste"], folder_id: "f2" },
  { id: "2", title: "Vampire", lead: "Untote Jäger der Nacht", aliases: ["Blutsauger"], text: "Sie meiden das Licht von Nebelhafen.", page_type: "spezies", tags: ["Untote"], folder_id: "f3" },
  { id: "3", title: "Haus Nebel", text: "Altes Adelshaus.", page_type: "organisation", tags: ["Küste"], folder_id: null },
];

describe("searchWiki", () => {
  it("sortiert Titeltreffer vor Textreferenzen", () => {
    const hits = searchWiki(entries, folders, { q: "nebel" });
    expect(hits.map((h) => h.entry.id)).toEqual(["1", "3", "2"]);
    expect(hits[2].snippet).toContain("Nebelhafen");
  });
  it("findet Alternativnamen und Kurztext", () => {
    expect(searchWiki(entries, folders, { q: "blutsauger" })[0].entry.id).toBe("2");
    expect(searchWiki(entries, folders, { q: "jäger" })[0].entry.id).toBe("2");
  });
  it("filtert nach Typ, Tag und Ordner (samt Unterordnern)", () => {
    expect(searchWiki(entries, folders, { type: "ort" }).map((h) => h.entry.id)).toEqual(["1"]);
    expect(searchWiki(entries, folders, { tag: "küste" }).map((h) => h.entry.id)).toEqual(["3", "1"]);
    expect(searchWiki(entries, folders, { folderId: "f1" }).map((h) => h.entry.id)).toEqual(["1"]);
  });
  it("kombiniert Suchtext und Filter", () => {
    expect(searchWiki(entries, folders, { q: "nebel", tag: "Küste", type: "organisation" }).map((h) => h.entry.id)).toEqual(["3"]);
    expect(searchWiki(entries, folders, { q: "gibtesnicht" })).toEqual([]);
  });
});
