// Musik-Links einer Szene: YouTube, Spotify, SoundCloud oder eine Audiodatei. Der Player wird erst nach einem Klick geladen.
export type MusicLink =
  | { kind: "youtube" | "spotify" | "soundcloud"; embed: string; label: string; detail?: string; uri?: string }
  | { kind: "audio"; src: string; label: string }
  // Spotify Jam (gemeinsame Hör-Sitzung) und Spotify-Kurzlinks: lassen sich nicht einbetten, öffnen sich in Spotify (App oder Web-Player)
  | { kind: "external"; href: string; label: string; detail?: string };

const SPOTIFY_KINDS: Record<string, string> = {
  track: "Titel",
  album: "Album",
  playlist: "Playlist",
  episode: "Folge",
  show: "Podcast",
  artist: "Künstler:in",
};

const AUDIO_EXT = /\.(mp3|ogg|oga|wav|m4a|aac|flac|opus)(\?|#|$)/i;

export function parseMusicLink(raw: string | null | undefined): MusicLink | null {
  const value = (raw ?? "").trim();
  if (!value || value.length > 500) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.replace(/^www\.|^m\./, "").toLowerCase();

  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    if (/^[\w-]{6,20}$/.test(id)) return { kind: "youtube", label: "YouTube", embed: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1` };
  }
  if (host === "youtube.com" || host === "music.youtube.com") {
    const list = url.searchParams.get("list");
    const v = url.searchParams.get("v") ?? url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{6,20})/)?.[1];
    if (v && /^[\w-]{6,20}$/.test(v)) return { kind: "youtube", label: "YouTube", embed: `https://www.youtube-nocookie.com/embed/${v}?autoplay=1` };
    if (list && /^[\w-]{10,60}$/.test(list)) return { kind: "youtube", label: "YouTube", embed: `https://www.youtube-nocookie.com/embed/videoseries?list=${list}&autoplay=1` };
  }
  if (host === "open.spotify.com" && /^\/(?:intl-[a-z]+\/)?socialsession\/[A-Za-z0-9_-]+/.test(url.pathname)) {
    return { kind: "external", label: "Spotify", detail: "Jam", href: url.toString() };
  }
  if (host === "spotify.link" && url.pathname.length > 1) return { kind: "external", label: "Spotify", detail: "Link", href: url.toString() };
  if (host === "open.spotify.com") {
    const m = url.pathname.match(/^\/(?:intl-[a-z]+\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]+)/);
    if (m) return { kind: "spotify", label: "Spotify", detail: SPOTIFY_KINDS[m[1]], embed: `https://open.spotify.com/embed/${m[1]}/${m[2]}`, uri: `spotify:${m[1]}:${m[2]}` };
    // Jam-Links gibt es in mehreren Formen (socialsession, jam …): jeder andere Spotify-Link öffnet sich einfach in Spotify
    if (/^\/(?:intl-[a-z]+\/)?(?:jam|socialsession|session)\b/i.test(url.pathname)) return { kind: "external", label: "Spotify", detail: "Jam", href: url.toString() };
  }
  if (host === "soundcloud.com") {
    return { kind: "soundcloud", label: "SoundCloud", embed: `https://w.soundcloud.com/player/?url=${encodeURIComponent(`${url.origin}${url.pathname}`)}&auto_play=true` };
  }
  if (AUDIO_EXT.test(url.pathname)) return { kind: "audio", label: "Audio", src: url.toString() };
  return null;
}
