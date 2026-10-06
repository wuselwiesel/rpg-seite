import { describe, expect, it } from "vitest";
import { assignKey, cycleId, filterByName, keyOf, resolveKeyMap } from "./writer-shortcuts";

describe("resolveKeyMap", () => {
  it("vergibt ohne eigene Belegung 1, 2, 3 in fester Reihenfolge", () => {
    expect(resolveKeyMap(["a", "b", "c"], {})).toEqual({ 1: "a", 2: "b", 3: "c" });
  });
  it("eigene Belegung gilt zuerst, die übrigen füllen freie Ziffern", () => {
    expect(resolveKeyMap(["a", "b", "c"], { c: "1" })).toEqual({ 1: "c", 2: "a", 3: "b" });
  });
  it("ignoriert Belegungen für unbekannte Charaktere und doppelte Ziffern", () => {
    expect(resolveKeyMap(["a", "b"], { x: "1", a: "2", b: "2" })).toEqual({ 1: "b", 2: "a" });
  });
  it("hat höchstens neun Plätze", () => {
    const ids = Array.from({ length: 12 }, (_, i) => `c${i}`);
    expect(Object.keys(resolveKeyMap(ids, {}))).toHaveLength(9);
  });
});

describe("assignKey / keyOf", () => {
  it("nimmt dieselbe Ziffer bei anderen weg", () => {
    expect(assignKey({ a: "1", b: "2" }, "b", "1")).toEqual({ b: "1" });
  });
  it("entfernt eine Belegung", () => {
    expect(assignKey({ a: "1" }, "a", null)).toEqual({});
  });
  it("findet die Ziffer eines Charakters", () => {
    expect(keyOf({ 2: "x" }, "x")).toBe("2");
    expect(keyOf({ 2: "x" }, "y")).toBeNull();
  });
});

describe("cycleId", () => {
  it("läuft vor und zurück im Kreis", () => {
    expect(cycleId(["a", "b", "c"], "c", 1)).toBe("a");
    expect(cycleId(["a", "b", "c"], "a", -1)).toBe("c");
    expect(cycleId(["a", "b", "c"], "b", 1)).toBe("c");
  });
  it("beginnt ohne Auswahl am Anfang bzw. Ende und kommt mit leerer Liste klar", () => {
    expect(cycleId(["a", "b"], undefined, 1)).toBe("a");
    expect(cycleId(["a", "b"], undefined, -1)).toBe("b");
    expect(cycleId([], "a", 1)).toBeNull();
  });
});

describe("filterByName", () => {
  const list = [{ name: "Dorian Blackwood" }, { name: "Vesper Nachtsang" }, { name: "Ärin Lund" }];
  it("findet Wortanfänge, auch ohne Umlaut und Großschreibung", () => {
    expect(filterByName(list, "black").map((c) => c.name)).toEqual(["Dorian Blackwood"]);
    expect(filterByName(list, "arin").map((c) => c.name)).toEqual(["Ärin Lund"]);
  });
  it("zeigt Wortanfänge vor Treffern in der Mitte und bei leerer Suche alles", () => {
    expect(filterByName(list, "ian").map((c) => c.name)).toEqual(["Dorian Blackwood"]);
    expect(filterByName(list, "n").map((c) => c.name)).toEqual(["Vesper Nachtsang", "Dorian Blackwood", "Ärin Lund"]);
    expect(filterByName(list, "  ")).toHaveLength(3);
  });
});
