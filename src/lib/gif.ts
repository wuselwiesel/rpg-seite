// GIFs kommen von Giphy oder Tenor (per Link/Suche) oder liegen im eigenen Speicher.
const ALLOWED_HOST_SUFFIXES = ["giphy.com", "tenor.com", "tenor.googleapis.com"];

export function isAllowedGifUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    return ALLOWED_HOST_SUFFIXES.some((s) => u.hostname === s || u.hostname.endsWith(`.${s}`));
  } catch {
    return false;
  }
}

// Macht aus einem eingefügten Giphy-Seitenlink (…/gifs/name-ID) einen direkten Bildlink.
export function normalizeGifUrl(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  try {
    const u = new URL(value);
    if (u.hostname.endsWith("giphy.com") && /^\/(gifs|stickers|clips)\//.test(u.pathname)) {
      const id = u.pathname.split("/").filter(Boolean).pop()?.split("-").pop();
      if (id) return `https://media.giphy.com/media/${id}/giphy.gif`;
    }
  } catch {
    return null;
  }
  return isAllowedGifUrl(value) ? value : null;
}

export type GifResult = { id: string; url: string; preview: string; title: string };
