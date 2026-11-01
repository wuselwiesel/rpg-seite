import { parseFolderIcon } from "@/lib/wiki-folder-style";

// Das Icon einer Wiki-Seite (Spalte icon_url) ist entweder die Adresse eines hochgeladenen Bildes
// oder ein Symbol aus der Bibliothek: „symbol:<Name>“ (auch ein Emoji oder :eigenes-emoji:).
const SYMBOL_PREFIX = "symbol:";

// Das gewählte Symbol hinter „symbol:“, sonst null (dann ist es ein Bild).
export function pageIconSymbol(value: string | null | undefined): string | null {
  return value?.startsWith(SYMBOL_PREFIX) ? value.slice(SYMBOL_PREFIX.length) || null : null;
}

export function symbolToPageIcon(symbol: string): string {
  return SYMBOL_PREFIX + symbol;
}

// Prüft den Wert aus dem Formular: nur eigene Bilder (http/https) oder ein Symbol, sonst kein Icon.
export function parsePageIcon(raw: string | null | undefined): string | null {
  const value = String(raw ?? "").trim();
  if (value.startsWith(SYMBOL_PREFIX)) {
    const symbol = parseFolderIcon(value.slice(SYMBOL_PREFIX.length));
    return symbol ? SYMBOL_PREFIX + symbol : null;
  }
  return /^https?:\/\//.test(value) && value.length <= 500 ? value : null;
}
