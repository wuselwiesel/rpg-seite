import { describe, expect, it } from "vitest";
import { DEFAULT_TOC, headingsOfHtml, isDefaultToc, parseToc, parseTocField, tocItems } from "./wiki-toc";

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
      mode: "auto", levels: 3, position: "side", numbered: false, title: "Inhalt", hidden: ["A"],
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
});
