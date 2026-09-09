export type PaletteId = "rose" | "amaranth" | "dusk" | "cocoa" | "lagoon";

export const PALETTES: {
  id: PaletteId;
  name: string;
  swatchLight: string;
  swatchDark: string;
}[] = [
  { id: "rose", name: "Rosé", swatchLight: "#a6646b", swatchDark: "#e3aeb3" },
  { id: "amaranth", name: "Amaranth", swatchLight: "#933b5b", swatchDark: "#cf7d97" },
  { id: "dusk", name: "Dusk", swatchLight: "#8a5f92", swatchDark: "#c9a0d1" },
  { id: "cocoa", name: "Cocoa", swatchLight: "#7f5836", swatchDark: "#f0b3ba" },
  { id: "lagoon", name: "Lagoon", swatchLight: "#3f8f89", swatchDark: "#f0a3b5" },
];

export const DEFAULT_PALETTE: PaletteId = "rose";
export const PALETTE_STORAGE_KEY = "palette";
