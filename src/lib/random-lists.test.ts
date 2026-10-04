import { describe, expect, it } from "vitest";
import { ENTRY_MAX_LENGTH, MAX_ENTRIES_PER_SUBMIT, groupEntries, isPoolKind, parseEntries } from "./random-lists";

describe("parseEntries", () => {
  it("eine Zeile pro Eintrag, ohne Leeres und Doppeltes", () => {
    expect(parseEntries("Anna\n\n  Ben  \nanna\r\nClara")).toEqual(["Anna", "Ben", "Clara"]);
  });
  it("entfernt Aufzählungszeichen und Nummern und glättet Leerraum", () => {
    expect(parseEntries("- Lesen\n* Zeichnen\n• Backen\n1. Tanzen\n2) Singen\nGitarre   spielen")).toEqual(["Lesen", "Zeichnen", "Backen", "Tanzen", "Singen", "Gitarre spielen"]);
  });
  it("kürzt lange Einträge und begrenzt die Anzahl", () => {
    expect(parseEntries("x".repeat(500))[0].length).toBe(ENTRY_MAX_LENGTH);
    const many = Array.from({ length: 300 }, (_, i) => `Eintrag ${i}`).join("\n");
    expect(parseEntries(many).length).toBe(MAX_ENTRIES_PER_SUBMIT);
  });
  it("gibt bei leerer Eingabe nichts zurück", () => {
    expect(parseEntries("")).toEqual([]);
    expect(parseEntries(" \n \n")).toEqual([]);
  });
});

describe("groupEntries / isPoolKind", () => {
  it("sortiert nach Art und ignoriert Unbekanntes", () => {
    const g = groupEntries([
      { kind: "vorname", text: "Zaphod" },
      { kind: "hobby", text: "Angeln" },
      { kind: "vorname", text: "Trillian" },
      { kind: "quatsch", text: "x" },
      { kind: "angst", text: "  " },
    ]);
    expect(g.vorname).toEqual(["Zaphod", "Trillian"]);
    expect(g.hobby).toEqual(["Angeln"]);
    expect(g.angst).toEqual([]);
    expect(isPoolKind("geheimnis")).toBe(true);
    expect(isPoolKind("geschlecht")).toBe(false);
  });
});
