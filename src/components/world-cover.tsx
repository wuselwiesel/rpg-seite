export function WorldCover({
  name,
  coverUrl,
  className = "h-32 w-full",
}: {
  name: string;
  coverUrl?: string | null;
  className?: string;
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-2 font-serif text-2xl text-fg ${className}`}
    >
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </div>
  );
}
