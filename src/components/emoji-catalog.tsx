"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEmojiMap } from "./custom-emoji-provider";
import { useIsDark } from "@/lib/use-dark";

// Erst beim Öffnen geladen, damit Seiten mit Eingabefeldern nicht schwerer werden.
const Inner = dynamic(() => import("./emoji-catalog-inner"), {
  ssr: false,
  loading: () => <div className="flex h-[360px] items-center justify-center text-sm text-muted">Lädt …</div>,
});

export function EmojiCatalog({
  onPick,
  height = 360,
  showUploadHint = true,
}: {
  onPick: (token: string) => void;
  height?: number;
  showUploadHint?: boolean;
}) {
  const map = useEmojiMap();
  const dark = useIsDark();
  return (
    <div className="flex flex-col">
      <Inner map={map} dark={dark} onPick={onPick} height={height} />
      {showUploadHint && (
        <Link href="/profile/emojis" className="px-3 py-2 text-xs text-accent hover:underline">
          {Object.keys(map).length === 0 ? "Noch keine eigenen Emojis – jetzt eins hochladen" : "Eigene Emojis verwalten"}
        </Link>
      )}
    </div>
  );
}
