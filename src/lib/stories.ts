// Hintergründe für Text-Storys (CSS-Verläufe) und Laufzeiten.
export const STORY_BACKGROUNDS: { id: string; css: string }[] = [
  { id: "sunset", css: "linear-gradient(135deg,#f6d365,#fda085)" },
  { id: "berry", css: "linear-gradient(135deg,#a18cd1,#fbc2eb)" },
  { id: "ocean", css: "linear-gradient(135deg,#43cea2,#185a9d)" },
  { id: "night", css: "linear-gradient(135deg,#232526,#414345)" },
  { id: "rose", css: "linear-gradient(135deg,#ee9ca7,#ffdde1)" },
  { id: "forest", css: "linear-gradient(135deg,#134e5e,#71b280)" },
];

export const STORY_DURATIONS: { hours: number; label: string }[] = [
  { hours: 6, label: "6 Stunden" },
  { hours: 12, label: "12 Stunden" },
  { hours: 24, label: "24 Stunden" },
  { hours: 48, label: "2 Tage" },
  { hours: 168, label: "7 Tage" },
];

const HEX_RE = /^#[0-9a-f]{6}$/i;

export function isValidStoryBg(bg: string): boolean {
  return HEX_RE.test(bg) || STORY_BACKGROUNDS.some((b) => b.id === bg);
}

// Preset-Verlauf oder frei gewählte Farbe (#rrggbb).
export function storyBackground(bg: string | null): string {
  if (bg && HEX_RE.test(bg)) return bg;
  return STORY_BACKGROUNDS.find((b) => b.id === bg)?.css ?? STORY_BACKGROUNDS[0].css;
}

// Ist der Hintergrund dunkel? Bestimmt die Standard-Textfarbe.
export function isDarkStoryBg(bg: string | null): boolean {
  if (bg && HEX_RE.test(bg)) {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(bg.slice(i, i + 2), 16));
    return 0.299 * r + 0.587 * g + 0.114 * b < 140;
  }
  return DARK_BGS.includes(bg ?? "");
}

export function timeAgo(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "gerade eben";
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  return `vor ${days} ${days === 1 ? "Tag" : "Tagen"}`;
}

export const OVERLAY_COLORS: { id: string; css: string }[] = [
  { id: "white", css: "#ffffff" },
  { id: "black", css: "#111111" },
  { id: "yellow", css: "#ffd84d" },
  { id: "pink", css: "#ff6fa5" },
  { id: "mint", css: "#7ee8c1" },
];

const DARK_BGS = ["night", "ocean", "forest"];

export function overlayColor(id: string): string {
  return OVERLAY_COLORS.find((c) => c.id === id)?.css ?? "#ffffff";
}


// Ältere Storys haben nur `text_content` – daraus wird ein zentrierter Text.
export function overlaysOf(story: {
  overlays: import("./types").StoryOverlay[] | null;
  text_content: string | null;
  image_url: string | null;
  video_url?: string | null;
  bg: string | null;
}): import("./types").StoryOverlay[] {
  if (story.overlays?.length) return story.overlays;
  if (!story.text_content) return [];
  return [
    {
      id: "legacy",
      t: story.text_content,
      x: 50,
      y: story.image_url || story.video_url ? 80 : 50,
      size: 7,
      color: story.image_url || story.video_url || isDarkStoryBg(story.bg) ? "white" : "black",
    },
  ];
}

export function parseOverlays(raw: string): import("./types").StoryOverlay[] {
  try {
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list
      .slice(0, 8)
      .map((o, i) => ({
        id: String(o.id ?? i).slice(0, 40),
        t: String(o.t ?? "").slice(0, 200),
        x: Math.min(100, Math.max(0, Number(o.x) || 50)),
        y: Math.min(100, Math.max(0, Number(o.y) || 50)),
        size: Math.min(16, Math.max(3, Number(o.size) || 7)),
        color: OVERLAY_COLORS.some((c) => c.id === o.color) ? String(o.color) : "white",
      }))
      .filter((o) => o.t.trim());
  } catch {
    return [];
  }
}
