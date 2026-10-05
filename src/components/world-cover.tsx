// Als Icon (ohne Hintergrund) hochgeladene Welt-Bilder erkennt man am Dateinamen „icon-…“ (siehe AvatarUpload, Variante „world“)
export const isIconCover = (url?: string | null) => Boolean(url && /\/icon-[0-9a-f-]+\.[a-z0-9]+(\?.*)?$/i.test(url));

export function WorldCover({
  name,
  coverUrl,
  className = "h-32 w-full",
}: {
  name: string;
  coverUrl?: string | null;
  className?: string;
}) {
  const icon = isIconCover(coverUrl);
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl font-serif text-2xl text-fg ${icon ? "" : "bg-surface-2"} ${className}`}
    >
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverUrl} alt={name} className={`h-full w-full ${icon ? "object-contain" : "object-cover"}`} />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </div>
  );
}
