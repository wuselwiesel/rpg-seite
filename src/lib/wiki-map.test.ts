import { describe, expect, it } from "vitest";
import { cleanPinInput, clampView, pointToPercent, viewCenteredOn, zoomAround } from "./wiki-map";

describe("pointToPercent", () => {
  const rect = { left: 100, top: 50, width: 400, height: 200 };
  it("rechnet Klickpunkte in Prozent um und begrenzt auf das Bild", () => {
    expect(pointToPercent(rect, 300, 150)).toEqual({ x: 50, y: 50 });
    expect(pointToPercent(rect, 0, 9999)).toEqual({ x: 0, y: 100 });
    expect(pointToPercent(rect, 101, 51)).toEqual({ x: 0.25, y: 0.5 });
  });
  it("übersteht ein leeres Rechteck", () => {
    expect(pointToPercent({ left: 0, top: 0, width: 0, height: 0 }, 5, 5)).toEqual({ x: 0, y: 0 });
  });
});

describe("Zoom und Verschieben", () => {
  const W = 800;
  const H = 500;
  it("hält das Bild im Ausschnitt", () => {
    expect(clampView({ scale: 1, tx: 50, ty: -40 }, W, H)).toEqual({ scale: 1, tx: 0, ty: 0 });
    expect(clampView({ scale: 2, tx: -9999, ty: 10 }, W, H)).toEqual({ scale: 2, tx: -800, ty: 0 });
    expect(clampView({ scale: 99, tx: 0, ty: 0 }, W, H).scale).toBe(8);
    expect(clampView({ scale: 0.1, tx: 0, ty: 0 }, W, H).scale).toBe(1);
  });
  it("zoomt um einen Punkt, der an Ort und Stelle bleibt", () => {
    const v = zoomAround({ scale: 1, tx: 0, ty: 0 }, 2, 400, 250, W, H);
    expect(v).toEqual({ scale: 2, tx: -400, ty: -250 });
    // Punkt (400,250) im Ausschnitt entspricht weiter Bildmitte (50 %)
    expect((400 - v.tx) / (W * v.scale)).toBeCloseTo(0.5);
  });
  it("zoomt nicht über die Grenzen hinaus", () => {
    const v = zoomAround({ scale: 8, tx: -3000, ty: -1500 }, 2, 100, 100, W, H);
    expect(v.scale).toBe(8);
    expect(zoomAround({ scale: 1, tx: 0, ty: 0 }, 0.5, 100, 100, W, H)).toEqual({ scale: 1, tx: 0, ty: 0 });
  });
  it("rückt einen Pin in die Mitte (am Rand so weit es geht)", () => {
    expect(viewCenteredOn(50, 50, 2, W, H)).toEqual({ scale: 2, tx: -400, ty: -250 });
    expect(viewCenteredOn(0, 0, 3, W, H)).toEqual({ scale: 3, tx: 0, ty: 0 });
  });
});

describe("cleanPinInput", () => {
  it("verlangt einen Namen und bereinigt Leerraum", () => {
    expect(cleanPinInput({ label: "   " })).toEqual({ error: "Bitte gib dem Pin einen Namen." });
    expect(cleanPinInput({ label: "  Nebel   hafen ", icon: " ⚓ ", pageId: "p", targetMapId: "" })).toEqual({
      label: "Nebel hafen",
      icon: "⚓",
      pageId: "p",
      targetMapId: null,
    });
  });
});
