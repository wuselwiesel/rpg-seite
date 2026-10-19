// iPhone-Fotos kommen oft als HEIC/HEIF. Nur Safari kann sie anzeigen; in Chrome, Firefox und Edge bleibt die Vorschau schwarz oder leer.
// Deshalb wandeln wir sie vor dem Zuschneiden und Hochladen in JPEG um (die Bibliothek wird erst bei Bedarf geladen).

// Manche Browser geben für HEIC-Dateien keinen Dateityp an: dann zählt die Endung.
export function looksHeic(file: File): boolean {
  return /^image\/hei[cf]/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
}

// Gibt für HEIC-Fotos ein JPEG zurück (gleiche Datei, falls der Browser sie selbst lesen kann oder die Umwandlung scheitert).
export async function normalizeImage(file: File): Promise<File> {
  if (!looksHeic(file)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    bitmap.close();
    return file;
  } catch {
    // Der Browser kann das Format nicht lesen: umwandeln.
  }
  try {
    const { heicTo } = await import("heic-to/next");
    const blob = await heicTo({ blob: file, type: "image/jpeg", quality: 0.9 });
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "foto"}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}
