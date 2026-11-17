import { describe, expect, it } from "vitest";
import { listenersFromPresence, listenersLabel } from "./listening";

describe("listenersFromPresence", () => {
  it("nimmt je Person den neuesten Eintrag und lässt dich selbst weg", () => {
    const out = listenersFromPresence(
      {
        a: [
          { userId: "a", name: "Anna", trackId: "t1", at: 1 },
          { userId: "a", name: "Anna", trackId: "t2", at: 5 },
        ],
        b: [{ userId: "b", name: "Ben", trackId: "t3", at: 2 }],
        me: [{ userId: "me", name: "Ich", trackId: "t9", at: 3 }],
      },
      "me",
    );
    expect(out).toEqual([
      { userId: "a", name: "Anna", trackId: "t2" },
      { userId: "b", name: "Ben", trackId: "t3" },
    ]);
  });
  it("ignoriert leere Einträge und sortiert nach Namen", () => {
    const out = listenersFromPresence({ z: [{ userId: "z", name: "Zoe", trackId: "t", at: 1 }], y: [{ userId: "y", name: "", trackId: "", at: 1 }], x: [{ userId: "x", name: "Alex", trackId: "t", at: 1 }] }, null);
    expect(out.map((l) => l.name)).toEqual(["Alex", "Zoe"]);
  });
});

describe("listenersLabel", () => {
  it("passt Zahl und Verb an", () => {
    expect(listenersLabel([])).toBe("");
    expect(listenersLabel(["Anna"])).toBe("Anna hört gerade");
    expect(listenersLabel(["Anna", "Ben"])).toBe("Anna und Ben hören gerade");
    expect(listenersLabel(["Anna", "Ben", "Cem"])).toBe("Anna, Ben und 1 weitere hören gerade");
    expect(listenersLabel(["Anna", "Ben", "Cem", "Dia"])).toBe("Anna, Ben und 2 weitere hören gerade");
  });
});
