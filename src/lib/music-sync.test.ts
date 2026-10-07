import { describe, expect, it } from "vitest";
import { decideSync } from "./music-sync";

describe("decideSync", () => {
  it("lässt es laufen, solange der Abstand klein ist", () => {
    expect(decideSync({ position: 10_000, paused: false }, { position: 9_200, paused: false, duration: 200_000 })).toEqual({ type: "none" });
  });
  it("springt bei großem Abstand an die Stelle des Hosts", () => {
    expect(decideSync({ position: 60_000, paused: false }, { position: 5_000, paused: false, duration: 200_000 })).toEqual({ type: "seek", seconds: 60.3, resume: false });
  });
  it("startet und springt, wenn man selbst pausiert hat", () => {
    expect(decideSync({ position: 30_000, paused: false }, { position: 30_000, paused: true, duration: 200_000 })).toEqual({ type: "seek", seconds: 30.3, resume: true });
  });
  it("pausiert mit dem Host", () => {
    expect(decideSync({ position: 30_000, paused: true }, { position: 30_000, paused: false, duration: 200_000 })).toEqual({ type: "pause" });
    expect(decideSync({ position: 30_000, paused: true }, { position: 30_000, paused: true, duration: 200_000 })).toEqual({ type: "none" });
  });
  it("sagt, wenn nur die Vorschau läuft und der Host schon weiter ist", () => {
    expect(decideSync({ position: 90_000, paused: false }, { position: 1_000, paused: false, duration: 29_713 })).toEqual({ type: "preview-only" });
  });
});
