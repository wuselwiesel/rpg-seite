import { ZoomableImage } from "@/components/zoomable-image";
import { isVideoUrl } from "@/lib/chat-media-url";

// Bild (per Klick groß) oder Video (mit Bedienelementen) in einer Chat-Nachricht.
export function ChatMedia({ url, size = "lg", className = "rounded-xl" }: { url: string; size?: "sm" | "lg"; className?: string }) {
  const box = size === "sm" ? "max-h-48 max-w-[14rem]" : "max-h-72 max-w-[20rem]";
  if (isVideoUrl(url)) {
    return <video src={url.includes("#") ? url : `${url}#t=0.1`} controls playsInline preload="metadata" className={`${box} ${className} bg-black object-contain`} />;
  }
  return (
    <ZoomableImage src={url} alt="Gesendetes Bild" className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="Gesendetes Bild" className={`${box} ${className} object-contain`} />
    </ZoomableImage>
  );
}

// Vorschau des gewählten, noch nicht gesendeten Anhangs über dem Eingabefeld.
export function AttachmentPreview({ url, className = "max-h-40" }: { url: string; className?: string }) {
  if (isVideoUrl(url)) return <video src={url} muted playsInline preload="metadata" className={`${className} max-w-full rounded-xl bg-black object-contain`} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="Vorschau" className={`${className} max-w-full rounded-xl object-contain`} />;
}
