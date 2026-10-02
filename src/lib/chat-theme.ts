import type { CSSProperties } from "react";
import { profileThemeStyle, luminance } from "@/lib/profile-theme";

export type ChatKind = "account" | "rp";

// Hauptfarbe: eigene Sprechblasen und Senden-Knopf. Akzent: Links, Markierungen, Hervorhebungen. Hintergrund: Fläche des Chats.
export type ChatTheme = { main: string | null; accent: string | null; bg: string | null };

export const EMPTY_CHAT_THEME: ChatTheme = { main: null, accent: null, bg: null };

const HEX = /^#[0-9a-fA-F]{6}$/;

export function isChatThemeEmpty(t: ChatTheme | null | undefined): boolean {
  return !t || (!t.main && !t.accent && !t.bg);
}

export const CHAT_THEME_PRESETS: { name: string; theme: ChatTheme }[] = [
  { name: "Mitternacht", theme: { main: "#4a5bb5", accent: "#8fa8ff", bg: "#14172b" } },
  { name: "Rosé", theme: { main: "#b4586b", accent: "#d4788a", bg: "#fbeff1" } },
  { name: "Wald", theme: { main: "#3f6b4f", accent: "#5f9a74", bg: "#eef5ef" } },
  { name: "Bernstein", theme: { main: "#b8742a", accent: "#d19a43", bg: "#fbf3e4" } },
  { name: "Flieder", theme: { main: "#7a5fb0", accent: "#9d82d6", bg: "#f3eefb" } },
  { name: "Schiefer", theme: { main: "#3d4660", accent: "#6e7aa0", bg: "#eef0f5" } },
];

// CSS-Variablen für den Chat-Container: Alles darin (Sprechblasen, Eingabe, Kopfzeile) übernimmt die Farben automatisch.
export function chatThemeStyle(theme: ChatTheme | null | undefined, dark = false): CSSProperties | undefined {
  if (isChatThemeEmpty(theme)) return undefined;
  const t = theme as ChatTheme;
  const style = profileThemeStyle(
    { accent: t.accent && HEX.test(t.accent) ? t.accent : t.main, bg: t.bg },
    dark,
  ) as Record<string, string>;
  if (t.main && HEX.test(t.main)) {
    style["--accent-strong"] = t.main;
    style["--on-accent-strong"] = luminance(t.main) > 0.4 ? "#1f1a1c" : "#fdfbf9";
    if (!t.accent) style["--accent"] = t.main;
  }
  return style as CSSProperties;
}
