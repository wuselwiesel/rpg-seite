import type { CSSProperties } from "react";

export const PROFILE_FONTS = [
  { id: "sans", name: "Modern", family: "var(--font-geist-sans), system-ui, sans-serif" },
  { id: "serif", name: "Klassisch", family: "var(--font-serif), Georgia, serif" },
  { id: "playfair", name: "Elegant", family: "var(--font-playfair), Georgia, serif" },
  { id: "lora", name: "Buchschrift", family: "var(--font-lora), Georgia, serif" },
  { id: "caveat", name: "Handschrift", family: "var(--font-caveat), cursive" },
  { id: "mono", name: "Schreibmaschine", family: "var(--font-geist-mono), ui-monospace, monospace" },
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

export function profileThemeStyle(theme: ProfileTheme): CSSProperties {
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
