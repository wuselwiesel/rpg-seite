import { describe, expect, it } from "vitest";
import { buildTagTree, noteOutline, noteStats, tagMatches } from "./notes";
import { BUILTIN_TEMPLATES, uncheckTasks } from "./note-templates";
import { sanitizePostHtmlCore } from "./sanitize-core";
import { buildFolderTree, canMoveFolder, descendantIds, flattenFolders, folderPath, noteTasks, openTasks, setTaskInHtml, inlineTags, inlineTargets, isLinkKind, noteMatches, normalizeTags, noteSnippet, noteTitle, type NoteView } from "./notes";

const note = (over: Partial<NoteView> = {}): NoteView => ({ id: "1", title: "", body: "", pinned: false, archived: false, deletedAt: null, tags: [], folderId: null, isTemplate: false, worldId: null, updatedAt: "2026-10-20T10:00:00Z", links: [], ...over });

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
  it("baut den Ordnerbaum und findet Pfade und Unterordner", () => {
    const f = [
      { id: "a", name: "Plots", parentId: null },
      { id: "b", name: "Nebelhafen", parentId: "a" },
      { id: "c", name: "Akt 1", parentId: "b" },
      { id: "d", name: "Figuren", parentId: null },
    ];
    expect(flattenFolders(f).map((n) => `${n.depth}:${n.name}`)).toEqual(["1:Figuren", "1:Plots", "2:Nebelhafen", "3:Akt 1"]);
    expect(buildFolderTree(f)).toHaveLength(2);
    expect(folderPath(f, "c").map((x) => x.name)).toEqual(["Plots", "Nebelhafen", "Akt 1"]);
    expect([...descendantIds(f, "a")].sort()).toEqual(["a", "b", "c"]);
  });
  it("erlaubt nur gültige Verschiebungen (kein Kreis, höchstens drei Ebenen)", () => {
    const f = [
      { id: "a", name: "A", parentId: null },
      { id: "b", name: "B", parentId: "a" },
      { id: "c", name: "C", parentId: "b" },
      { id: "d", name: "D", parentId: null },
    ];
    expect(canMoveFolder(f, "a", "c")).toBe(false); // unter den eigenen Unterordner
    expect(canMoveFolder(f, "a", "a")).toBe(false);
    expect(canMoveFolder(f, "d", "b")).toBe(true); // b liegt auf Ebene 2, d darunter auf Ebene 3
    expect(canMoveFolder(f, "a", "d")).toBe(false); // der Baum a/b/c hat drei Ebenen, unter d wären es vier
    expect(canMoveFolder(f, "c", null)).toBe(true);
    expect(canMoveFolder(f, "d", "c")).toBe(false); // c ist schon Ebene 3
  });
  it("setzt Haken in Vorlagen zurück", () => {
    const html = '<li data-type="taskItem" data-checked="true"><label><input type="checkbox" disabled="disabled" checked="checked" /></label></li>';
    const out = uncheckTasks(html);
    expect(out).toContain('data-checked="false"');
    expect(out).not.toContain(`checked="checked"`);
    expect(out).toContain("disabled");
  });
  it("mitgelieferte Vorlagen überstehen die Bereinigung", () => {
    for (const t of BUILTIN_TEMPLATES) {
      const out = sanitizePostHtmlCore(t.body);
      expect(out).toContain("<h2>");
      expect(out.length).toBeGreaterThan(40);
    }
  });
});

import { markdownToHtml, noteDocument, noteToMarkdown } from "./note-markdown";

describe("Notiz als Markdown", () => {
  it("wandelt Überschriften, Formatierung, Links und Zitate um", () => {
    const md = noteToMarkdown('<h2>Plan</h2><p>Ein <strong>wichtiger</strong> und <em>kursiver</em> Text mit <a href="https://x.de">Link</a>.</p><blockquote><p>Zitat</p></blockquote>');
    expect(md).toBe("## Plan\n\nEin **wichtiger** und *kursiver* Text mit [Link](https://x.de).\n\n> Zitat\n");
  });
  it("wandelt Listen, Aufgaben und Verschachtelung um", () => {
    const md = noteToMarkdown('<ul><li><p>Eins</p><ul><li><p>Unter</p></li></ul></li></ul><ol><li><p>A</p></li><li><p>B</p></li></ol><ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="checkbox" /><span></span></label><div><p>Fertig</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox" /></label><div><p>Offen</p></div></li></ul>');
    expect(md).toBe("- Eins\n  - Unter\n\n1. A\n2. B\n\n- [x] Fertig\n- [ ] Offen\n");
  });
  it("wandelt Tabellen und Code um", () => {
    const md = noteToMarkdown("<table><tbody><tr><th>Wer</th><th>Was</th></tr><tr><td>A</td><td>b | c</td></tr></tbody></table><pre><code>x &lt; y</code></pre>");
    expect(md).toBe("| Wer | Was |\n| --- | --- |\n| A | b \\| c |\n\n```\nx < y\n```\n");
  });
  it("baut ein Dokument mit Titel und Tags", () => {
    expect(noteDocument({ title: "Idee", body: "<p>Text</p>", tags: ["plot", "szene"] })).toBe("# Idee\n\n#plot #szene\n\nText\n");
    expect(noteDocument({ title: "", body: "<p>x</p>", tags: [] })).toBe("# Ohne Titel\n\nx\n");
  });
  it("baut den Tag-Baum und kennt Unter-Tags", () => {
    const tree = buildTagTree(["plot", "plot/nebelhafen", "plot/akt-1", "figuren", "plot"]);
    expect(tree.map((n) => n.full)).toEqual(["figuren", "plot"]);
    expect(tree[1].children.map((n) => n.full)).toEqual(["plot/akt-1", "plot/nebelhafen"]);
    expect(tagMatches("plot/nebelhafen", "plot")).toBe(true);
    expect(tagMatches("plotter", "plot")).toBe(false);
    expect(normalizeTags(["#Plot/Nebelhafen", "a//b/c/d/e"])).toEqual(["plot/nebelhafen", "a/b/c"]);
  });
});

describe("Markdown → HTML", () => {
  it("wandelt Überschriften, Formatierung, Listen und Tabellen um", () => {
    const html = markdownToHtml("# Titel\n\nEin **fetter** und ==markierter== Text.\n\n- a\n- b\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n");
    expect(html).toContain("<h1>Titel</h1>");
    expect(html).toContain("<strong>fetter</strong>");
    expect(html).toContain("<mark>markierter</mark>");
    expect(html).toContain("<li>a</li>");
    expect(html).toContain("<table>");
  });
  it("macht aus - [ ] Aufgabenlisten", () => {
    const html = markdownToHtml("- [x] Fertig\n- [ ] Offen\n");
    expect(html).toContain('<ul data-type="taskList">');
    expect(html).toContain('data-checked="true"');
    expect(html).toContain('data-checked="false"');
    expect(html).toContain("<p>Offen</p>");
  });
  it("lässt ==x== im Code in Ruhe", () => {
    expect(markdownToHtml("`a==b==c`")).toContain("<code>a==b==c</code>");
  });
  it("Rundlauf Markdown → HTML → Markdown bleibt gleich", () => {
    const md = "# Titel\n\nText mit **fett**.\n\n- [x] Fertig\n- [ ] Offen\n";
    expect(noteToMarkdown(markdownToHtml(md))).toBe(md);
  });
});

describe("Gliederung und Info", () => {
  it("liest Überschriften mit Ebene und Position", () => {
    const html = "<h1>Titel</h1><p>x</p><h2>Teil <em>eins</em></h2><h3></h3><h3>Unter</h3>";
    expect(noteOutline(html)).toEqual([
      { level: 1, text: "Titel", index: 0 },
      { level: 2, text: "Teil eins", index: 1 },
      { level: 3, text: "Unter", index: 3 },
    ]);
  });
  it("zählt Wörter, Zeichen, Absätze und Lesezeit", () => {
    const s = noteStats("<p>Ein kurzer Satz.</p><p></p><p>Zwei</p>");
    expect(s).toEqual({ words: 4, characters: 21, charactersNoSpaces: 18, readingMinutes: 1, paragraphs: 2 });
    expect(noteStats("").readingMinutes).toBe(0);
    expect(noteStats("<p>" + "wort ".repeat(450) + "</p>").readingMinutes).toBe(3);
  });
});

