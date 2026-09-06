export function CharacterAvatar({
  name,
  avatarUrl,
  size = 40,
}: {
  name: string;
  avatarUrl: string | null | undefined;
  size?: number;
}) {
  return (
    <div
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2 font-semibold text-fg"
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </div>
  );
}
