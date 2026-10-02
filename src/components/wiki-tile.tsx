// Vorschau-Kachel einer Wiki-Seite: das Titelbild, sonst der Anfangsbuchstabe auf einem Farbton der gewählten Palette.
const TINTS = [
  "bg-surface-2 text-accent-strong",
  "bg-surface-3 text-accent",
  "bg-chip text-on-chip",
];

export function tintIndex(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % TINTS.length;
}

const SIZES = {
  sm: "h-11 w-11 rounded-lg text-xl",
  md: "h-16 w-16 rounded-xl text-3xl",
  lg: "h-20 w-20 rounded-2xl text-4xl sm:h-24 sm:w-24 sm:text-5xl",
};

export function WikiTile({
  id,
  title,
  cover,
  size = "md",
}: {
  id: string;
  title: string;
  cover?: string | null;
  size?: keyof typeof SIZES;
}) {
  const base = `${SIZES[size]} shrink-0 overflow-hidden`;
  if (cover) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={cover} alt="" loading="lazy" className={`${base} bg-surface-2 object-cover`} />
    );
  }
  const letter = title.match(/[\p{L}\p{N}]/u)?.[0]?.toUpperCase() ?? "§";
  return (
    <span aria-hidden className={`${base} flex items-center justify-center font-serif font-semibold ${TINTS[tintIndex(id)]}`}>
      {letter}
    </span>
  );
}
