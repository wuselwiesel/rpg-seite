import { parseMusicLink } from "@/lib/scene-music";

// Name eines Titels über die öffentliche oEmbed-Schnittstelle (ohne Konto): Spotify, YouTube, SoundCloud.
// Gibt nur die Abfrage-Adresse für bekannte Dienste zurück; alles andere (Audiodatei, Jam, fremde Hosts) bleibt ohne Abfrage.
export function oembedUrl(raw: string): string | null {
  const link = parseMusicLink(raw);
  if (!link) return null;
  if (link.kind === "spotify" && link.uri) {
    const [, type, id] = link.uri.split(":");
    return type && id ? `https://open.spotify.com/oembed?url=${encodeURIComponent(`https://open.spotify.com/${type}/${id}`)}` : null;
  }
  if (link.kind === "youtube") return `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(raw.trim())}`;
  if (link.kind === "soundcloud") return `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(raw.trim())}`;
  return null;
}

// Holt den Namen (höchstens 80 Zeichen) oder null, wenn der Dienst nicht antwortet. Kurze Wartezeit, damit das Hinzufügen nie hängt.
export async function fetchTrackTitle(raw: string): Promise<string | null> {
  const url = oembedUrl(raw);
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000), headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const json = (await res.json()) as { title?: unknown };
    const title = typeof json.title === "string" ? json.title.replace(/\s+/g, " ").trim().slice(0, 80) : "";
    return title || null;
  } catch {
    return null;
  }
}
