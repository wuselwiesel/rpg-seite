import type { CSSProperties } from "react";

export const PROFILE_FONTS = [
  { id: "sans", name: "Modern", family: "var(--font-geist-sans), system-ui, sans-serif" },
  { id: "serif", name: "Klassisch", family: "var(--font-serif), Georgia, serif" },
  { id: "playfair", name: "Elegant", family: "var(--font-playfair), Georgia, serif" },
  { id: "lora", name: "Buchschrift", family: "var(--font-lora), Georgia, serif" },
  { id: "caveat", name: "Handschrift", family: "var(--font-caveat), cursive" },
  { id: "mono", name: "Schreibmaschine", family: "var(--font-geist-mono), ui-monospace, monospace" },
  { id: "cinzel", name: "Antik", family: "var(--font-cinzel), Georgia, serif" },
  { id: "cinzelDecorative", name: "Fantasy-Zierschrift", family: "var(--font-cinzel-decorative), Georgia, serif" },
  { id: "medievalSharp", name: "Mittelalterlich", family: "var(--font-medieval-sharp), cursive" },
  { id: "metamorphous", name: "Abenteuer", family: "var(--font-metamorphous), Georgia, serif" },
  { id: "pirataOne", name: "Gothic", family: "var(--font-pirata-one), cursive" },
  { id: "unifraktur", name: "Altdeutsch", family: "var(--font-unifraktur), cursive" },
  { id: "nosifer", name: "Horror", family: "var(--font-nosifer), cursive" },
  { id: "eagleLake", name: "Kalligraphie", family: "var(--font-eagle-lake), cursive" },
  { id: "greatVibes", name: "Schwungvoll", family: "var(--font-great-vibes), cursive" },
  { id: "dancingScript", name: "Verspielt", family: "var(--font-dancing-script), cursive" },
  { id: "ebGaramond", name: "Zeitlos", family: "var(--font-eb-garamond), Georgia, serif" },
  { id: "crimsonPro", name: "Roman", family: "var(--font-crimson-pro), Georgia, serif" },
  { id: "spectral", name: "Literarisch", family: "var(--font-spectral), Georgia, serif" },
  { id: "specialElite", name: "Vintage-Maschine", family: "var(--font-special-elite), ui-monospace, monospace" },
  { id: "josefinSans", name: "Geometrisch", family: "var(--font-josefin-sans), system-ui, sans-serif" },
  { id: "quicksand", name: "Weich", family: "var(--font-quicksand), system-ui, sans-serif" },
  { id: "bebasNeue", name: "Plakativ", family: "var(--font-bebas-neue), system-ui, sans-serif" },
  { id: "abrilFatface", name: "Dramatisch", family: "var(--font-abril-fatface), Georgia, serif" },
  { id: "imFellEnglish", name: "Antiquariat", family: "var(--font-im-fell-english), Georgia, serif" },
] as const;

export type ProfileTheme = {
  font?: string | null;
  accent?: string | null;
  bg?: string | null;
};

const HEX = /^#[0-9a-fA-F]{6}$/;

function toRgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

function toHex([r, g, b]: [number, number, number]): string {
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = toRgb(a);
  const [br, bg, bb] = toRgb(b);
  return toHex([ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t]);
}

function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function toHsl(hex: string): [number, number, number] {
  const [r, g, b] = toRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function fromHsl(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return toHex([f(0) * 255, f(8) * 255, f(4) * 255]);
}

// Im Dunkelmodus werden helle Profilfarben abgedunkelt bzw. dunkle Akzente aufgehellt,
// damit das Profil zum gewählten Modus passt und lesbar bleibt.
function adaptForDark(theme: ProfileTheme): ProfileTheme {
  const result = { ...theme };
  if (theme.bg && HEX.test(theme.bg) && luminance(theme.bg) >= 0.25) {
    const [h, s] = toHsl(theme.bg);
    result.bg = fromHsl(h, Math.min(s, 0.3), 0.1);
  }
  if (theme.accent && HEX.test(theme.accent) && luminance(theme.accent) < 0.25) {
    const [h, s, l] = toHsl(theme.accent);
    result.accent = fromHsl(h, s, Math.max(l, 0.68));
  }
  return result;
}

export function profileThemeStyle(input: ProfileTheme, dark = false): CSSProperties {
  const theme = dark ? adaptForDark(input) : input;
  const style: Record<string, string> = {};

  const font = PROFILE_FONTS.find((f) => f.id === theme.font);
  if (font) {
    style["--font-serif"] = font.family;
    style.fontFamily = font.family;
  }

  if (theme.accent && HEX.test(theme.accent)) {
    style["--accent"] = theme.accent;
    style["--accent-strong"] = theme.accent;
    style["--on-accent-strong"] = luminance(theme.accent) > 0.4 ? "#1f1a1c" : "#fdfbf9";
  }

  if (theme.bg && HEX.test(theme.bg)) {
    const dark = luminance(theme.bg) < 0.25;
    const fg = dark ? "#f3ece8" : "#2a2630";
    style["--app"] = theme.bg;
    style["--surface"] = dark ? mix(theme.bg, "#ffffff", 0.06) : mix(theme.bg, "#ffffff", 0.6);
    style["--surface-2"] = mix(theme.bg, fg, 0.07);
    style["--surface-3"] = mix(theme.bg, fg, 0.12);
    style["--line"] = mix(theme.bg, fg, 0.16);
    style["--fg"] = fg;
    style["--fg-soft"] = mix(fg, theme.bg, 0.25);
    style["--muted"] = mix(fg, theme.bg, 0.5);
    style.backgroundColor = theme.bg;
    style.color = fg;
  }

  return style as CSSProperties;
}

// Farben für die Text-Kachel eines Beitrags im Profilstil des Charakters (Hintergrund + passende Schriftfarbe).
export function themeTileColors(input: ProfileTheme, dark = false): { bg?: string; fg?: string } {
  const theme = dark ? adaptForDark(input) : input;
  if (!theme.bg || !HEX.test(theme.bg)) return {};
  return { bg: theme.bg, fg: luminance(theme.bg) < 0.25 ? "#f3ece8" : "#2a2630" };
}
