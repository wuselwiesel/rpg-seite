import { saveDefaultFont } from "@/app/profile/font-actions";

// Gemerkte Standard-Schriftart für neuen Text im Editor. Der Browser-Speicher dient als schneller Zwischenspeicher
// (der Editor liest synchron); die verbindliche Kopie liegt im Konto (`profiles.default_font`), damit sie auf allen
// Geräten gilt. `DefaultFontSync` gleicht beides beim Start ab.
export const DEFAULT_FONT_KEY = "wortwinkel:default-font";

export function loadDefaultFontId(): string | null {
  try {
    return localStorage.getItem(DEFAULT_FONT_KEY);
  } catch {
    return null;
  }
}

export function saveDefaultFontId(id: string | null) {
  try {
    if (id) localStorage.setItem(DEFAULT_FONT_KEY, id);
    else localStorage.removeItem(DEFAULT_FONT_KEY);
  } catch {
    /* egal */
  }
  void saveDefaultFont(id).catch(() => {});
}
