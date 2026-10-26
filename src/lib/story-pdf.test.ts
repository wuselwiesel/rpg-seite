import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { buildBookPdf } from "./story-pdf";
import type { Book } from "./story-book";

const entry = (author: string, html: string) => ({ kind: "entry" as const, author, html });
const scene = (id: string, title: string, entries: ReturnType<typeof entry>[]) => ({ id, title, author: "Lyra", location: "Hafen", time: null, introHtml: "<p>Einleitung äöüß</p>", coverImage: null, entries });
const book = (scenes: ReturnType<typeof scene>[]): Book => ({ title: "Geschichte", subtitle: "Eine Geschichte aus Nebelhafen", worldName: "Nebelhafen", coverImage: null, scenes });

describe("buildBookPdf", () => {
  it("erzeugt ein gültiges PDF mit Umlauten, Emojis und typografischen Zeichen", async () => {
    const bytes = await buildBookPdf(book([scene("1", "Der Herbstball 🍂", [entry("Lyra 🦊", "<p>„Hallo“ – das ist … ein Test 😀 mit ß und 漢字</p>")])]));
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1);
  });
  it("bricht lange Texte und sehr lange Wörter auf mehrere Seiten um", async () => {
    const long = `<p>${"Dies ist ein langer Satz, der sich wiederholt. ".repeat(400)}</p>`;
    const url = `<p>${"x".repeat(400)}</p>`;
    const bytes = await buildBookPdf(book([scene("1", "Lang", [entry("A", long), entry("B", url)])]));
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(2);
  });
  it("mehrere Szenen: Titelseite plus je Szene eine neue Seite", async () => {
    const bytes = await buildBookPdf(book([scene("1", "Eins", [entry("A", "<p>a</p>")]), scene("2", "Zwei", [entry("B", "<p>b</p>")])]));
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(3);
  });
  it("leere Szene bricht nicht ab", async () => {
    const bytes = await buildBookPdf(book([scene("1", "Leer", [])]));
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });
});
