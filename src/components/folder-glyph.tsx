"use client";

import { Folder, FolderOpen } from "lucide-react";
import { EmojiText, useEmojiMap } from "./custom-emoji-provider";
import { folderColorHex } from "@/lib/wiki-folder-style";

// Symbol eines Wiki-Ordners: das gewählte Emoji, sonst ein Ordner in der gewählten Farbe.
export function FolderGlyph({
  icon,
  color,
  open = false,
  className = "h-4 w-4",
  textClass = "",
}: {
  icon?: string | null;
  color?: string | null;
  open?: boolean;
  className?: string;
  // Schriftgröße des Emojis (erbt sonst die der Umgebung)
  textClass?: string;
}) {
  const hex = folderColorHex(color);
  const emojiMap = useEmojiMap();
  // Ein eigenes Emoji (:name:), das es in dieser Welt nicht gibt (z. B. aus einer anderen Welt), zeigt den normalen Ordner statt des rohen Textes
  const known = !icon || !/^:[a-z0-9_]{2,32}:$/.test(icon) || Boolean(emojiMap[icon.slice(1, -1)]);
  if (icon && known) {
    return (
      <span aria-hidden className={`${textClass} inline-flex shrink-0 items-center justify-center leading-none`}>
        <EmojiText text={icon} />
      </span>
    );
  }
  const Cmp = open ? FolderOpen : Folder;
  return <Cmp aria-hidden className={`${className} shrink-0 ${hex ? "" : "text-muted"}`} strokeWidth={1.75} style={hex ? { color: hex } : undefined} />;
}
