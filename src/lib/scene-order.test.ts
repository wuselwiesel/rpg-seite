import { describe, expect, it } from "vitest";
import { compareScenes, placeScene, shiftScene } from "./scene-order";

const s = (id: string, sortOrder: number | null, createdAt: string) => ({ id, sortOrder, createdAt });

describe("Szenen-Reihenfolge", () => {
  it("sortiert manuell vor unsortiert, unsortiert nach Anlegezeit (neueste zuerst)", () => {
    const list = [s("a", null, "2026-10-01"), s("b", 2, "2026-09-01"), s("c", null, "2026-10-05"), s("d", 1, "2026-10-09")];
    expect(list.sort(compareScenes).map((x) => x.id)).toEqual(["d", "b", "c", "a"]);
  });
  it("setzt eine Szene vor eine andere oder ans Ende", () => {
    expect(placeScene(["a", "b", "c"], "c", "a")).toEqual(["c", "a", "b"]);
    expect(placeScene(["a", "b", "c"], "a", null)).toEqual(["b", "c", "a"]);
    expect(placeScene(["a", "b"], "x", "b")).toEqual(["a", "x", "b"]);
    expect(placeScene(["a", "b"], "a", "a")).toEqual(["b", "a"]);
  });
  it("verschiebt um eine Stelle, ohne die Grenzen zu verlassen", () => {
    expect(shiftScene(["a", "b", "c"], "b", -1)).toEqual(["b", "a", "c"]);
    expect(shiftScene(["a", "b", "c"], "a", -1)).toEqual(["a", "b", "c"]);
    expect(shiftScene(["a", "b", "c"], "c", 1)).toEqual(["a", "b", "c"]);
  });
});
