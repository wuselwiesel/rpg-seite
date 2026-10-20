import { describe, expect, it } from "vitest";
import { noteTasks, openTasks, setTaskInHtml, inlineTags, inlineTargets, isLinkKind, noteMatches, normalizeTags, noteSnippet, noteTitle, type NoteView } from "./notes";

const note = (over: Partial<NoteView> = {}): NoteView => ({ id: "1", title: "", body: "", pinned: false, tags: [], folderId: null, worldId: null, updatedAt: "2026-10-20T10:00:00Z", links: [], ...over });

describe("Notizbuch", () => {
  it("nimmt den Titel, sonst den Anfang des Textes", () => {
    expect(noteTitle({ title: " Plan ", body: "<p>x</p>" })).toBe("Plan");
    expect(noteTitle({ title: "", body: "<p>Tilo und <b>Lucian</b> treffen sich</p>" })).toBe("Tilo und Lucian treffen sich");
    expect(noteTitle({ title: "", body: "" })).toBe("Ohne Titel");
  });
  it("kürzt die Vorschau", () => {
    expect(noteSnippet("<p>" + "a".repeat(200) + "</p>", 10)).toBe("aaaaaaaaa…");
  });
  it("findet über Titel, Text und verknüpfte Namen", () => {
    const n = note({ title: "Idee", body: "<p>Nebelhafen</p>", links: [{ id: "l", kind: "character", targetId: "c", label: "Lucian", href: "/characters/c" }] });
    expect(noteMatches(n, "idee")).toBe(true);
    expect(noteMatches(n, "nebel")).toBe(true);
    expect(noteMatches(n, "lucian")).toBe(true);
    expect(noteMatches(n, "xyz")).toBe(false);
    expect(noteMatches(n, "  ")).toBe(true);
  });
  it("kennt nur gültige Verknüpfungsarten", () => {
    expect(isLinkKind("wiki")).toBe(true);
    expect(isLinkKind("post")).toBe(false);
  });
  it("liest [[Seiten]] und @-Erwähnungen aus dem Text", () => {
    const html = '<p>Siehe [[Pinewood]] und [[Gilde der Lotsen|die Gilde]] mit <span class="mention" data-type="mention" data-id="fa01c351-edbf-4f24-9794-b14964b2b610">@Lyra</span>, [[Pinewood]].</p>';
    expect(inlineTargets(html)).toEqual({ wikiTitles: ["Pinewood", "Gilde der Lotsen"], characterIds: ["fa01c351-edbf-4f24-9794-b14964b2b610"] });
    expect(inlineTargets("<p>nichts</p>")).toEqual({ wikiTitles: [], characterIds: [] });
  });
  it("bereinigt Tags und filtert mit #", () => {
    expect(normalizeTags(["#Plot", " plot ", "Neue Idee", "a!b", ""])).toEqual(["plot", "neue-idee", "ab"]);
    const n = note({ tags: ["plot"], body: "<p>x</p>" });
    expect(noteMatches(n, "#plot")).toBe(true);
    expect(noteMatches(n, "#idee")).toBe(false);
    expect(noteMatches(n, "plo")).toBe(true);
  });
  it("erkennt #Tags im Text, aber keine Zahlen, Farben oder Wortmitten", () => {
    expect(inlineTags("<p>Idee #Plot und (#Nebelhafen) sowie #2 und a#b und #ff00aa</p>")).toEqual(["plot", "nebelhafen", "ff00aa"]);
    expect(inlineTags("<p>kein Tag</p>")).toEqual([]);
  });
  it("liest Aufgaben und findet die offenen", () => {
    const html = '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="checkbox" disabled="disabled" checked="checked" /><span></span></label><div><p>Erledigt</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox" disabled="disabled" /><span></span></label><div><p>Offen <b>wichtig</b></p></div></li></ul>';
    expect(noteTasks(html)).toEqual([
      { index: 0, text: "Erledigt", checked: true },
      { index: 1, text: "Offen wichtig", checked: false },
    ]);
    expect(openTasks(html).map((t) => t.text)).toEqual(["Offen wichtig"]);
  });
  it("hakt eine Aufgabe ab und wieder auf", () => {
    const html = '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox" disabled="disabled" /><span></span></label><div><p>A</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox" disabled="disabled" /><span></span></label><div><p>B</p></div></li></ul>';
    const done = setTaskInHtml(html, 1, true) as string;
    expect(noteTasks(done).map((t) => t.checked)).toEqual([false, true]);
    expect(done).toContain('checked="checked"');
    const undone = setTaskInHtml(done, 1, false) as string;
    expect(noteTasks(undone).map((t) => t.checked)).toEqual([false, false]);
    expect(undone).not.toContain('checked="checked"');
    expect(setTaskInHtml(html, 5, true)).toBeNull();
  });
});
