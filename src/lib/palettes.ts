export type PaletteId =
  | "rose"
  | "amaranth"
  | "dusk"
  | "cocoa"
  | "lagoon"
  | "blueberrypatch"
  | "heidelbeere"
  | "waldlichtung"
  | "kirschbluete"
  | "sonnenkoralle"
  | "fliederdunst"
  | "neonriff"
  | "drachenfrucht"
  | "nebeldrache"
  | "karamell"
  | "sturmhimmel"
  | "traumwolke"
  | "zwielicht"
  | "weinrot"
  | "minzgarten"
  | "korallenriff"
  | "granatapfel"
  | "rosentau"
  | "abendrot";

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
  { id: "blueberrypatch", name: "Blaubeerfeld", swatchLight: "#47c295", swatchDark: "#aee0ce" },
  { id: "heidelbeere", name: "Heidelbeere", swatchLight: "#3e86cc", swatchDark: "#aac7e4" },
  { id: "waldlichtung", name: "Waldlichtung", swatchLight: "#84b059", swatchDark: "#c6e0ae" },
  { id: "kirschbluete", name: "Kirschblüte", swatchLight: "#4aa3bf", swatchDark: "#aed4e0" },
  { id: "sonnenkoralle", name: "Sonnenkoralle", swatchLight: "#cc7c3e", swatchDark: "#e4c3aa" },
  { id: "fliederdunst", name: "Fliederdunst", swatchLight: "#5d83ac", swatchDark: "#aec6e0" },
  { id: "neonriff", name: "Neonriff", swatchLight: "#b4cc3e", swatchDark: "#dbe4aa" },
  { id: "drachenfrucht", name: "Drachenfrucht", swatchLight: "#cc6f3e", swatchDark: "#e4beaa" },
  { id: "nebeldrache", name: "Nebeldrache", swatchLight: "#cc7b3e", swatchDark: "#e4c3aa" },
  { id: "karamell", name: "Karamell", swatchLight: "#c85142", swatchDark: "#e3b2ab" },
  { id: "sturmhimmel", name: "Sturmhimmel", swatchLight: "#3e81cc", swatchDark: "#aac5e4" },
  { id: "traumwolke", name: "Traumwolke", swatchLight: "#523ecc", swatchDark: "#b2aae4" },
  { id: "zwielicht", name: "Zwielicht", swatchLight: "#824dbc", swatchDark: "#c6aee0" },
  { id: "weinrot", name: "Weinrot", swatchLight: "#cc3e60", swatchDark: "#e4aab8" },
  { id: "minzgarten", name: "Minzgarten", swatchLight: "#93b752", swatchDark: "#cee0ae" },
  { id: "korallenriff", name: "Korallenriff", swatchLight: "#cc5e3e", swatchDark: "#e4b7aa" },
  { id: "granatapfel", name: "Granatapfel", swatchLight: "#cc3e4b", swatchDark: "#e4aaaf" },
  { id: "rosentau", name: "Rosentau", swatchLight: "#bb4f53", swatchDark: "#e0aeb0" },
  { id: "abendrot", name: "Abendrot", swatchLight: "#cc7e3e", swatchDark: "#e4c4aa" },
];

export const DEFAULT_PALETTE: PaletteId = "rose";
export const PALETTE_STORAGE_KEY = "palette";
