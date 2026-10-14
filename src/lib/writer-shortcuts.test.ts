import { describe, expect, it } from "vitest";
import { cycleId, filterByName, pushRecent } from "./writer-shortcuts";

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

describe("pushRecent", () => {
  it("setzt den bisherigen Charakter direkt hinter den neuen", () => {
    expect(pushRecent([], "b", "a", 12)).toEqual(["b", "a"]);
    expect(pushRecent(["x", "y"], "b", "a", 12)).toEqual(["b", "a", "x", "y"]);
  });
  it("führt jede Id nur einmal und kürzt die Liste", () => {
    expect(pushRecent(["a", "b", "c"], "a", "b", 12)).toEqual(["a", "b", "c"]);
    expect(pushRecent(["x", "y", "z"], "b", "a", 3)).toEqual(["b", "a", "x"]);
  });
  it("kommt ohne bisherigen Charakter klar", () => {
    expect(pushRecent(["x"], "b", undefined, 12)).toEqual(["b", "x"]);
  });
});
