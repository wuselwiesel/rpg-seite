import { Play } from "lucide-react";

// Foto oder Video eines Beitrags. `thumb` zeigt Videos als stilles Vorschaubild mit Play-Symbol (Profil-Raster).
export function PostMedia({
  url,
  type,
  alt,
  thumb = false,
  className = "",
}: {
  url: string;
  type: "image" | "video";
  alt: string;
  thumb?: boolean;
  className?: string;
}) {
  if (type === "image") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={alt} className={className} loading="lazy" />;
  }
  if (thumb) {
    return (
      <>
        <video src={`${url}#t=0.1`} preload="metadata" muted playsInline className={className} />
        <Play className="pointer-events-none absolute right-2 top-2 h-5 w-5 fill-white text-white drop-shadow" strokeWidth={1.5} />
      </>
    );
  }
  return <video src={`${url}#t=0.1`} controls playsInline preload="metadata" className={className} />;
}
