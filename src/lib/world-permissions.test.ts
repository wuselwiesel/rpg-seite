import { describe, expect, it } from "vitest";
import { canEditWikiPage, parsePermissions, permissionsFromForm, resolveRights, strictPermissions } from "./world-permissions";

describe("world-permissions", () => {
  it("leere Einstellung = alles erlaubt", () => {
    const r = resolveRights(parsePermissions({}), false);
    expect(r).toMatchObject({ wikiCreate: true, wikiEdit: "all", wikiStructure: true, storyCreate: true, arcCreate: true });
  });
  it("ungültige Werte fallen auf offen zurück", () => {
    expect(parsePermissions({ wiki_edit: "boom", wiki_structure: "own" })).toMatchObject({ wiki_edit: "all", wiki_structure: "all" });
  });
  it("strenge Voreinstellung: nur Eigenes bearbeiten, Struktur nur Admins", () => {
    const r = resolveRights(strictPermissions(), false);
    expect(r.wikiEdit).toBe("own");
    expect(r.wikiStructure).toBe(false);
    expect(r.wikiCreate).toBe(true);
  });
  it("Admins dürfen immer alles", () => {
    const r = resolveRights({ wiki_create: "admins", wiki_edit: "admins", wiki_structure: "admins", story_create: "admins", arc_create: "admins" }, true);
    expect(r).toMatchObject({ wikiCreate: true, wikiEdit: "all", wikiStructure: true });
  });
  it("Bearbeiten: eigene Seite ja, fremde nein", () => {
    const r = resolveRights(strictPermissions(), false);
    expect(canEditWikiPage(r, "u1", "u1")).toBe(true);
    expect(canEditWikiPage(r, "u2", "u1")).toBe(false);
    expect(canEditWikiPage(resolveRights(parsePermissions({ wiki_edit: "admins" }), false), "u1", "u1")).toBe(false);
  });
  it("liest das Formular", () => {
    const fd = new FormData();
    fd.set("perm_wiki_edit", "admins");
    fd.set("perm_arc_create", "own");
    expect(permissionsFromForm(fd, strictPermissions())).toMatchObject({ wiki_edit: "admins", arc_create: "all" });
  });
});
