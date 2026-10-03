// Farben und Icons der Wiki-Ordner: eine feste Auswahl, die in hellem und dunklem Modus gut lesbar ist.
export const FOLDER_COLORS = [
  { id: "rose", label: "Rosé", hex: "#c0707a" },
  { id: "peach", label: "Pfirsich", hex: "#e0a070" },
  { id: "gold", label: "Gold", hex: "#c9a227" },
  { id: "sage", label: "Salbei", hex: "#6f9e7a" },
  { id: "teal", label: "Türkis", hex: "#4f9a9a" },
  { id: "sky", label: "Himmelblau", hex: "#5b8fc9" },
  { id: "slate", label: "Schiefer", hex: "#6b7090" },
  { id: "plum", label: "Pflaume", hex: "#9a6fb0" },
  { id: "gray", label: "Grau", hex: "#8a8794" },
] as const;

export type FolderColorId = (typeof FOLDER_COLORS)[number]["id"];

export function folderColorHex(id: string | null | undefined): string | null {
  return FOLDER_COLORS.find((c) => c.id === id)?.hex ?? null;
}

export function parseFolderColor(raw: string | null | undefined): FolderColorId | null {
  return FOLDER_COLORS.find((c) => c.id === raw)?.id ?? null;
}

// Emoji oder :eigenes-emoji: (höchstens 40 Zeichen, keine Steuerzeichen).
export function parseFolderIcon(raw: string | null | undefined): string | null {
  const icon = String(raw ?? "").trim();
  if (!icon || icon.length > 40 || /[\u0000-\u001f<>]/.test(icon)) return null;
  return icon;
}
