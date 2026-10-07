// Spotify-Einbettung mit Steuerung (iFrame-API): abspielen, pausieren, an eine Stelle springen, Position melden.
export type SpotifyPlayback = { isPaused: boolean; isBuffering: boolean; duration: number; position: number; playingURI?: string };
export type SpotifyController = {
  play: () => void;
  pause: () => void;
  resume: () => void;
  togglePlay: () => void;
  seek: (seconds: number) => void;
  loadUri: (uri: string) => void;
  destroy: () => void;
  addListener: (event: "ready" | "playback_update", cb: (e: { data: SpotifyPlayback }) => void) => void;
};
type IFrameAPI = {
  createController: (el: HTMLElement, options: { uri: string; width?: string | number; height?: string | number }, cb: (c: SpotifyController) => void) => void;
};

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: IFrameAPI) => void;
  }
}

let apiPromise: Promise<IFrameAPI> | null = null;

// Lädt das Skript von Spotify erst, wenn ein Spotify-Titel abgespielt wird (und nur einmal).
export function loadSpotifyApi(): Promise<IFrameAPI> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<IFrameAPI>((resolve, reject) => {
    window.onSpotifyIframeApiReady = (api) => resolve(api);
    const script = document.createElement("script");
    script.src = "https://open.spotify.com/embed/iframe-api/v1";
    script.async = true;
    script.onerror = () => {
      apiPromise = null;
      reject(new Error("Spotify konnte nicht geladen werden."));
    };
    document.body.appendChild(script);
  });
  return apiPromise;
}
