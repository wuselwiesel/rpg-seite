import { describe, expect, it } from "vitest";
import { DEFAULT_TOC, headingsOfHtml, isDefaultToc, keyedHeadings, parseToc, parseTocField, resolveToc, tocItems } from "./wiki-toc";

const h = (text: string, level: 2 | 3, n: number) => ({ id: `abschnitt-${n}`, text, level });
const heads = [h("Zweck", 2, 1), h("Vorbereitung", 3, 2), h("Ablauf", 2, 3), h("Folgen", 2, 4)];

describe("Inhaltsverzeichnis", () => {
  it("zeigt ohne Einstellung alles, aber erst ab drei Überschriften", () => {
    expect(tocItems(heads, null)).toHaveLength(4);
    expect(tocItems(heads.slice(0, 2), null)).toEqual([]);
  });

  it("kann aus sein", () => {
    expect(tocItems(heads, { ...DEFAULT_TOC, mode: "off" })).toEqual([]);
  });

  it("zeigt mit eigener Einstellung auch weniger als drei Einträge", () => {
    expect(tocItems(heads.slice(0, 1), { ...DEFAULT_TOC })).toHaveLength(1);
  });

  it("kann nur Hauptüberschriften zeigen", () => {
    expect(tocItems(heads, { ...DEFAULT_TOC, levels: 2 }).map((i) => i.text)).toEqual(["Zweck", "Ablauf", "Folgen"]);
  });

  it("blendet gewählte Überschriften aus (Groß-/Kleinschreibung egal)", () => {
    expect(tocItems(heads, { ...DEFAULT_TOC, hidden: ["ablauf", " Vorbereitung "] }).map((i) => i.text)).toEqual(["Zweck", "Folgen"]);
  });

  it("nummeriert auf Wunsch", () => {
    expect(tocItems(heads, { ...DEFAULT_TOC, numbered: true }).map((i) => i.number)).toEqual(["1.", "1.1", "2.", "3."]);
    expect(tocItems(heads, DEFAULT_TOC).every((i) => i.number === null)).toBe(true);
  });

  it("prüft Werte aus Datenbank und Formular", () => {
    expect(parseToc(null)).toBeNull();
    expect(parseToc("x")).toBeNull();
    expect(parseToc([])).toBeNull();
    expect(parseToc({ mode: "komisch", levels: 9, position: "x", numbered: "ja", title: "  Inhalt  ", hidden: ["A", "A", 5, ""] })).toEqual({
      ...DEFAULT_TOC, title: "Inhalt", hidden: ["A"],
    });
    expect(parseTocField("{kaputt")).toBeNull();
    expect(parseTocField('{"mode":"off"}')?.mode).toBe("off");
    expect(isDefaultToc(DEFAULT_TOC)).toBe(true);
    expect(isDefaultToc({ ...DEFAULT_TOC, numbered: true })).toBe(false);
  });

  it("liest Überschriften aus dem Editor-HTML", () => {
    expect(headingsOfHtml("<p>a</p><h2>Zweck</h2><p>b</p><h3><strong>Vor&nbsp;bereitung</strong></h3><h4>nein</h4><h2></h2>")).toEqual([
      { text: "Zweck", level: 2 },
      { text: "Vor bereitung", level: 3 },
    ]);
  });

  it("vergibt Schlüssel, auch bei gleichnamigen Überschriften", () => {
    expect(keyedHeadings([{ text: "Ablauf" }, { text: " ablauf " }, { text: "Ende" }]).map((x) => x.key)).toEqual(["ablauf", "ablauf#2", "ende"]);
  });

  it("blendet nur die gewählte von zwei gleichnamigen Überschriften aus", () => {
    const two = [h("Ablauf", 2, 1), h("Ablauf", 2, 2), h("Ende", 2, 3)];
    expect(tocItems(two, { ...DEFAULT_TOC, hidden: ["ablauf#2"] }).map((i) => i.id)).toEqual(["abschnitt-1", "abschnitt-3"]);
  });

  it("zeigt eigene Namen statt der Überschrift", () => {
    expect(tocItems(heads, { ...DEFAULT_TOC, labels: { ablauf: "So geht es" } }).map((i) => i.text)).toEqual(["Zweck", "Vorbereitung", "So geht es", "Folgen"]);
  });

  it("sortiert nach der gewünschten Reihenfolge, der Rest folgt im Text", () => {
    expect(tocItems(heads, { ...DEFAULT_TOC, order: ["folgen", "zweck"] }).map((i) => i.text)).toEqual(["Folgen", "Zweck", "Vorbereitung", "Ablauf"]);
  });

  it("nummeriert nach der gewählten Reihenfolge", () => {
    const items = tocItems(heads, { ...DEFAULT_TOC, numbered: true, order: ["folgen"] });
    expect(items.map((i) => `${i.number} ${i.text}`)).toEqual(["1. Folgen", "2. Zweck", "2.1 Vorbereitung", "3. Ablauf"]);
  });

  it("hängt eigene Einträge mit Link an und ordnet sie ein", () => {
    const toc = { ...DEFAULT_TOC, extra: [{ id: "abc", label: "Siehe auch", pageId: "11111111-1111-1111-1111-111111111111" }], order: ["x:abc"] };
    const items = tocItems(heads, toc);
    expect(items[0]).toMatchObject({ text: "Siehe auch", href: "/wiki/11111111-1111-1111-1111-111111111111" });
    expect(items).toHaveLength(5);
  });

  it("zeigt erst ab N Überschriften, wenn so eingestellt", () => {
    expect(tocItems(heads, { ...DEFAULT_TOC, minHeadings: 5 })).toEqual([]);
    expect(tocItems(heads, { ...DEFAULT_TOC, minHeadings: 4 })).toHaveLength(4);
  });

  it("prüft Namen, Reihenfolge, eigene Einträge und Mindestzahl", () => {
    const toc = parseToc({
      labels: { Ablauf: "  Kurz  ", leer: "  ", 5: 3 },
      order: ["a", "a", 5, "b"],
      extra: [{ id: "ok1", label: " Mehr ", pageId: "11111111-1111-1111-1111-111111111111" }, { id: "BAD!", label: "x", pageId: "11111111-1111-1111-1111-111111111111" }, { id: "ok2", label: "x", pageId: "kein-uuid" }],
      minHeadings: 99,
    });
    expect(toc?.labels).toEqual({ Ablauf: "Kurz" });
    expect(toc?.order).toEqual(["a", "b"]);
    expect(toc?.extra).toEqual([{ id: "ok1", label: "Mehr", pageId: "11111111-1111-1111-1111-111111111111" }]);
    expect(toc?.minHeadings).toBe(10);
    expect(isDefaultToc({ ...DEFAULT_TOC, labels: { a: "b" } })).toBe(false);
    expect(isDefaultToc({ ...DEFAULT_TOC, minHeadings: 3 })).toBe(false);
  });

  it("nimmt die erste vorhandene Einstellung: Seite, Art, Welt", () => {
    expect(resolveToc(null, { mode: "off" }, { levels: 2 })?.mode).toBe("off");
    expect(resolveToc(null, null, { levels: 2 })?.levels).toBe(2);
    expect(resolveToc({ numbered: true }, { mode: "off" }, null)?.numbered).toBe(true);
    expect(resolveToc(null, undefined, "x")).toBeNull();
  });

  it("liest „A &amp; B“ im Editor-HTML wie im Artikel", () => {
    expect(headingsOfHtml("<h2>A &amp; B</h2>")).toEqual([{ text: "A & B", level: 2 }]);
  });
});
