// Chat-Anhänge liegen in `image_url`; Videos erkennt man an der Dateiendung (hochgeladen wird immer mit Endung).
const VIDEO_EXT = /\.(mp4|m4v|mov|webm|ogv)(\?|#|$)/i;

export function isVideoUrl(url: string | null | undefined): boolean {
  return !!url && VIDEO_EXT.test(url);
}
