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

export function storyBackground(bg: string | null): string {
  return STORY_BACKGROUNDS.find((b) => b.id === bg)?.css ?? STORY_BACKGROUNDS[0].css;
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
