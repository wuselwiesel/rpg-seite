import { describe, expect, it } from "vitest";
import { isAnimatedImage } from "./image-animation";

const bytes = (s: string) => Uint8Array.from(Array.from(s, (c) => c.charCodeAt(0)));

describe("isAnimatedImage", () => {
  it("erkennt animiertes WebP über das Animations-Flag", () => {
    const b = new Uint8Array(30);
    b.set(bytes("RIFF"), 0);
    b.set(bytes("WEBP"), 8);
    b.set(bytes("VP8X"), 12);
    b[20] = 0x02;
    expect(isAnimatedImage(b)).toBe(true);
    b[20] = 0;
    expect(isAnimatedImage(b)).toBe(false);
  });

  it("erkennt APNG über acTL vor IDAT, Standbild-PNG nicht", () => {
    const chunk = (type: string, len: number) => {
      const c = new Uint8Array(12 + len);
      c[3] = len;
      c.set(bytes(type), 4);
      return c;
    };
    const sig = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const join = (...p: Uint8Array[]) => Uint8Array.from(p.flatMap((x) => Array.from(x)));
    expect(isAnimatedImage(join(sig, chunk("IHDR", 13), chunk("acTL", 8), chunk("IDAT", 4)))).toBe(true);
    expect(isAnimatedImage(join(sig, chunk("IHDR", 13), chunk("IDAT", 4), chunk("IEND", 0)))).toBe(false);
  });

  it("GIF mit einem Bild ist nicht animiert, mit mehreren schon", () => {
    const head = bytes("GIF89a");
    const make = (frames: number) => {
      const arr = [...head, 0, 0, 0, 0, 0, 0, 0];
      for (let i = 0; i < frames; i++) arr.push(0x00, 0x2c, 1, 2, 3);
      return Uint8Array.from(arr);
    };
    expect(isAnimatedImage(make(1))).toBe(false);
    expect(isAnimatedImage(make(3))).toBe(true);
  });
});
