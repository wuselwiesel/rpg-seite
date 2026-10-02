// Erkennt, ob eine Bilddatei animiert ist (GIF, animiertes WebP, APNG), damit sie beim Hochladen
// nicht über ein Canvas zu einem Standbild plattgedrückt wird.
const ascii = (b: Uint8Array, from: number, len: number) => String.fromCharCode(...b.subarray(from, from + len));

export function isAnimatedImage(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  if (ascii(bytes, 0, 3) === "GIF") {
    // Mehr als ein Bild-Block (0x2C) = animiert. Einfacher Heuristik-Zähler über den Datenstrom.
    let frames = 0;
    for (let i = 13; i < bytes.length - 1; i++) {
      if (bytes[i] === 0x00 && bytes[i + 1] === 0x2c) frames++;
      if (frames > 1) return true;
    }
    return false;
  }
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    // VP8X-Kopf: Bit 1 der Flags (Byte 20) = Animation.
    return ascii(bytes, 12, 4) === "VP8X" && bytes.length > 20 && (bytes[20] & 0x02) !== 0;
  }
  if (bytes[0] === 0x89 && ascii(bytes, 1, 3) === "PNG") {
    // APNG hat einen "acTL"-Block vor den Bilddaten.
    let i = 8;
    while (i + 8 <= bytes.length) {
      const len = ((bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]) >>> 0;
      const type = ascii(bytes, i + 4, 4);
      if (type === "acTL") return true;
      if (type === "IDAT" || type === "IEND") return false;
      i += 12 + len;
    }
  }
  return false;
}
