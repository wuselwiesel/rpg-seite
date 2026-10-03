import { describe, expect, it } from "vitest";
import { planMapImage } from "./map-image";

describe("planMapImage", () => {
  it("lässt SVG und GIF immer unverändert", () => {
    expect(planMapImage("image/svg+xml", 20000, 10000)).toEqual({ kind: "keep" });
    expect(planMapImage("image/gif", 9000, 9000)).toEqual({ kind: "keep" });
  });
  it("lässt Bilder bis 6000 Pixel in PNG, JPEG und WebP unverändert", () => {
    expect(planMapImage("image/png", 6000, 3500)).toEqual({ kind: "keep" });
    expect(planMapImage("image/jpeg", 3200, 2000)).toEqual({ kind: "keep" });
    expect(planMapImage("image/webp", 5000, 5000)).toEqual({ kind: "keep" });
  });
  it("verkleinert größere Bilder im selben Format (PNG bleibt PNG)", () => {
    expect(planMapImage("image/png", 12000, 6000)).toEqual({ kind: "shrink", scale: 0.5, type: "image/png" });
    expect(planMapImage("image/jpeg", 8000, 4000)).toEqual({ kind: "shrink", scale: 0.75, type: "image/jpeg" });
    expect(planMapImage("image/webp", 7500, 3000)).toEqual({ kind: "shrink", scale: 0.8, type: "image/jpeg" });
  });
  it("wandelt unbekannte Formate in JPEG um", () => {
    expect(planMapImage("image/heic", 4000, 3000)).toEqual({ kind: "shrink", scale: 1, type: "image/jpeg" });
  });
});
