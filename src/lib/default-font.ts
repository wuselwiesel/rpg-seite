// Gemerkte Standard-Schriftart für neuen Text im Editor (pro Gerät, bleibt zwischen Beiträgen erhalten).
const KEY = "wortwinkel:default-font";

export function loadDefaultFontId(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function saveDefaultFontId(id: string | null) {
  try {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  } catch {
    /* egal */
  }
}
