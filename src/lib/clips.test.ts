import { describe, expect, it } from "vitest";
import { clipJumpHref, clipToText, collectionToText, defaultClipTitle, excerptInHtml, quoteFromExcerpts, quoteFromItems, quoteSnippet, type Clip } from "./clips";

const id1 = "11111111-1111-4111-8111-111111111111";
const id2 = "22222222-2222-4222-8222-222222222222";

const clip: Clip = {
  id: "c1",
  title: "Die Warnung",
  note: "Wichtig für später",
  scene_title: "Der Nebel steigt",
  story_post_id: "s1",
  created_at: "2026-10-06T10:00:00Z",
  items: [
    { id: id1, author: "Vesper", html: "<p>Geh nicht dorthin.</p><p>Bitte.</p>", at: "2026-09-21T00:35:00Z" },
    { id: id2, author: "Dorian", html: "<p>Zu spät &amp; zu dunkel.</p>", at: "2026-09-21T00:41:00Z" },
  ],
};

describe("clipJumpHref", () => {
  it("springt zur ersten Nachricht und hebt alle hervor", () => {
    expect(clipJumpHref("s1", [id1, id2])).toBe(`/story/s1?hervor=${id1},${id2}#beitrag-${id1}`);
  });
  it("fällt ohne gültige Ids auf die Szene zurück", () => {
    expect(clipJumpHref("s1", ["x"])).toBe("/story/s1");
    expect(clipJumpHref("s1", [])).toBe("/story/s1");
  });
});

describe("Text-Export", () => {
  it("enthält Titel, Szene, Notiz und alle Nachrichten mit Absätzen", () => {
    const text = clipToText(clip);
    expect(text).toContain("Die Warnung");
    expect(text).toContain("Szene: Der Nebel steigt");
    expect(text).toContain("Notiz: Wichtig für später");
    expect(text).toContain("Vesper, ");
    expect(text).toContain("Geh nicht dorthin.\nBitte.");
    expect(text).toContain("Zu spät & zu dunkel.");
  });
  it("macht aus einer Sammlung einen Text mit Kopfzeile", () => {
    const text = collectionToText("Erinnerungen", "Mira", [clip]);
    expect(text.startsWith("Erinnerungen (Mira)\n===")).toBe(true);
    expect(collectionToText("Leer", "Mira", [])).toContain("Noch keine Ausschnitte.");
  });
});

describe("Titel und Zitat", () => {
  it("schlägt den Textanfang als Titel vor", () => {
    expect(defaultClipTitle(clip.items, "Szene")).toBe("Geh nicht dorthin. Bitte.");
    expect(defaultClipTitle([], "Szene")).toBe("Szene");
  });
  it("kürzt lange Texte", () => {
    expect(quoteSnippet(`<p>${"a".repeat(300)}</p>`).length).toBe(220);
  });
  it("baut ein Zitat mit höchstens sechs Zeilen", () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ id: `${i}`, author: "A", html: "<p>x</p>", at: "2026-09-21T00:35:00Z" }));
    const q = quoteFromItems("s1", many, { title: "T" });
    expect(q.items).toHaveLength(6);
    expect(q.entryIds).toHaveLength(9);
    expect(q.title).toBe("T");
  });
});

describe("Textausschnitte", () => {
  const html = "<p>Kapitän Kaelen stand längst am Bug.</p><p>„Du kommst spät“, rief er &amp; lachte.</p>";
  it("erkennt Ausschnitte, die wirklich in der Nachricht stehen", () => {
    expect(excerptInHtml(html, "Kaelen stand längst")).toBe(true);
    expect(excerptInHtml(html, "am Bug.\n\nDu kommst spät")).toBe(true);
    expect(excerptInHtml(html, "rief er & lachte")).toBe(true);
    expect(excerptInHtml(html, "KAELEN STAND")).toBe(true);
  });
  it("lehnt Fremdes und Leeres ab", () => {
    expect(excerptInHtml(html, "Kaelen stand nie am Bug")).toBe(false);
    expect(excerptInHtml(html, "   ")).toBe(false);
    expect(excerptInHtml(html, "...")).toBe(false);
  });
  it("baut ein Zitat mit Markierung und gekürztem Text", () => {
    const q = quoteFromExcerpts(id1, [{ id: id2, author: "Kaelen", text: `  ${"a ".repeat(500)}  ` }]);
    expect(q.excerpt).toBe(true);
    expect(q.entryIds).toEqual([id2]);
    expect(q.items[0].text.length).toBeLessThanOrEqual(600);
    expect(q.items[0].author).toBe("Kaelen");
  });
});
