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

export type PaletteSwatch = { bg: string; accent: string; strong: string };

// Farben werden aus globals.css übernommen (Hintergrund, Akzent, Button), damit die
// Vorschau im Picker der tatsächlichen Palette entspricht.
export const PALETTES: {
  id: PaletteId;
  name: string;
  light: PaletteSwatch;
  dark: PaletteSwatch;
}[] = [
  { id: "rose", name: "Rosé", light: { bg: "#fbf5f0", accent: "#96565d", strong: "#525871" }, dark: { bg: "#17151b", accent: "#e3aeb3", strong: "#f2c1a3" } },
  { id: "amaranth", name: "Amaranth", light: { bg: "#f7f1e6", accent: "#933b5b", strong: "#6c775a" }, dark: { bg: "#1a1712", accent: "#cf7d97", strong: "#b9c2ab" } },
  { id: "dusk", name: "Dusk", light: { bg: "#f6f3f7", accent: "#815989", strong: "#547089" }, dark: { bg: "#16151c", accent: "#c9a0d1", strong: "#9fbfd6" } },
  { id: "cocoa", name: "Cocoa", light: { bg: "#fbf2ee", accent: "#9d4d60", strong: "#7f5836" }, dark: { bg: "#1c1512", accent: "#f0b3ba", strong: "#c99a6e" } },
  { id: "lagoon", name: "Lagoon", light: { bg: "#f2f7f5", accent: "#317371", strong: "#c94562" }, dark: { bg: "#101917", accent: "#7fc9c3", strong: "#f0a3b5" } },
  { id: "blueberrypatch", name: "Blaubeerfeld", light: { bg: "#f0f7f4", accent: "#2c7458", strong: "#2f7c8d" }, dark: { bg: "#151b19", accent: "#aee0ce", strong: "#a8deeb" } },
  { id: "heidelbeere", name: "Heidelbeere", light: { bg: "#eef4f9", accent: "#2e6caf", strong: "#2b7d7d" }, dark: { bg: "#15181b", accent: "#aac7e4", strong: "#a8ebeb" } },
  { id: "waldlichtung", name: "Waldlichtung", light: { bg: "#f3f7f0", accent: "#527333", strong: "#79772a" }, dark: { bg: "#181b15", accent: "#c6e0ae", strong: "#ebe8a8" } },
  { id: "kirschbluete", name: "Kirschblüte", light: { bg: "#f0f5f7", accent: "#326f7d", strong: "#913045" }, dark: { bg: "#151a1b", accent: "#aed4e0", strong: "#eba8b7" } },
  { id: "sonnenkoralle", name: "Sonnenkoralle", light: { bg: "#faf3ed", accent: "#935a27", strong: "#913041" }, dark: { bg: "#1b1815", accent: "#e4c3aa", strong: "#eba8b3" } },
  { id: "fliederdunst", name: "Fliederdunst", light: { bg: "#f0f3f7", accent: "#476990", strong: "#3e3091" }, dark: { bg: "#15181b", accent: "#aec6e0", strong: "#b2a8eb" } },
  { id: "neonriff", name: "Neonriff", light: { bg: "#f7f9ee", accent: "#616f1e", strong: "#305891" }, dark: { bg: "#1a1b15", accent: "#dbe4aa", strong: "#9ec1f5" } },
  { id: "drachenfrucht", name: "Drachenfrucht", light: { bg: "#f9f2ee", accent: "#9f532a", strong: "#913053" }, dark: { bg: "#1b1715", accent: "#e4beaa", strong: "#f59ebe" } },
  { id: "nebeldrache", name: "Nebeldrache", light: { bg: "#f9f3ee", accent: "#935927", strong: "#463091" }, dark: { bg: "#1b1815", accent: "#e4c3aa", strong: "#b6a8eb" } },
  { id: "karamell", name: "Karamell", light: { bg: "#f7f1f0", accent: "#b74435", strong: "#7d732b" }, dark: { bg: "#1b1615", accent: "#e3b2ab", strong: "#ebe2a8" } },
  { id: "sturmhimmel", name: "Sturmhimmel", light: { bg: "#eef3f9", accent: "#2d6aab", strong: "#3c3091" }, dark: { bg: "#15181b", accent: "#aac5e4", strong: "#b0a8eb" } },
  { id: "traumwolke", name: "Traumwolke", light: { bg: "#efedfa", accent: "#523ecc", strong: "#683091" }, dark: { bg: "#16151b", accent: "#b2aae4", strong: "#cfa8eb" } },
  { id: "zwielicht", name: "Zwielicht", light: { bg: "#f3f0f7", accent: "#824dbc", strong: "#2e7e89" }, dark: { bg: "#18151b", accent: "#c6aee0", strong: "#a8e1eb" } },
  { id: "weinrot", name: "Weinrot", light: { bg: "#f9eef1", accent: "#c33356", strong: "#916f30" }, dark: { bg: "#1b1517", accent: "#e4aab8", strong: "#ebd5a8" } },
  { id: "minzgarten", name: "Minzgarten", light: { bg: "#f4f7f0", accent: "#5c702f", strong: "#2c816e" }, dark: { bg: "#191b15", accent: "#cee0ae", strong: "#a8ebda" } },
  { id: "korallenriff", name: "Korallenriff", light: { bg: "#f9f1ee", accent: "#af4a2e", strong: "#2e7e89" }, dark: { bg: "#1b1615", accent: "#e4b7aa", strong: "#a8e1eb" } },
  { id: "granatapfel", name: "Granatapfel", light: { bg: "#f8eff0", accent: "#c33340", strong: "#49812c" }, dark: { bg: "#1b1516", accent: "#e4aaaf", strong: "#bfeba8" } },
  { id: "rosentau", name: "Rosentau", light: { bg: "#f7f0f0", accent: "#b64549", strong: "#2c8177" }, dark: { bg: "#1b1515", accent: "#e0aeb0", strong: "#a8ebe1" } },
  { id: "abendrot", name: "Abendrot", light: { bg: "#f9f3ee", accent: "#935b27", strong: "#303f91" }, dark: { bg: "#1b1815", accent: "#e4c4aa", strong: "#a8b2eb" } },
];

export const DEFAULT_PALETTE: PaletteId = "rose";
export const PALETTE_STORAGE_KEY = "palette";
