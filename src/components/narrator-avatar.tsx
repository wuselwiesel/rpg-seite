import { Feather } from "lucide-react";

// Neutraler Avatar für Erzähler:in-Beiträge: gehört keinem Charakter.
export function NarratorAvatar({ size = 36 }: { size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-surface-3 text-fg-soft"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Feather style={{ width: size * 0.5, height: size * 0.5 }} strokeWidth={1.75} />
    </span>
  );
}
