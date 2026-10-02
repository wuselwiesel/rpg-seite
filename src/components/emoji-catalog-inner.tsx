"use client";

import { useMemo } from "react";
import EmojiPicker, { Categories, Theme, type EmojiClickData } from "emoji-picker-react";
import type { EmojiMap } from "@/lib/custom-emoji";

const CATEGORIES = [
  { category: Categories.SUGGESTED, name: "Zuletzt benutzt" },
  { category: Categories.CUSTOM, name: "Eigene Emojis" },
  { category: Categories.SMILEYS_PEOPLE, name: "Smileys & Personen" },
  { category: Categories.ANIMALS_NATURE, name: "Tiere & Natur" },
  { category: Categories.FOOD_DRINK, name: "Essen & Trinken" },
  { category: Categories.TRAVEL_PLACES, name: "Reisen & Orte" },
  { category: Categories.ACTIVITIES, name: "Aktivitäten" },
  { category: Categories.OBJECTS, name: "Objekte" },
  { category: Categories.SYMBOLS, name: "Symbole" },
  { category: Categories.FLAGS, name: "Flaggen" },
];

// Ein Katalog für alles: normale Emojis plus die eigenen der Welt (wie bei Notion). `onPick` bekommt
// entweder das Emoji selbst oder `:name:` für ein eigenes.
export default function EmojiCatalogInner({
  map,
  dark,
  onPick,
  width = "100%",
  height = 360,
}: {
  map: EmojiMap;
  dark: boolean;
  onPick: (token: string) => void;
  width?: number | string;
  height?: number | string;
}) {
  const customEmojis = useMemo(
    () => Object.entries(map).map(([name, url]) => ({ id: `:${name}:`, names: [name], imgUrl: url })),
    [map],
  );
  return (
    <EmojiPicker
      theme={dark ? Theme.DARK : Theme.LIGHT}
      width={width}
      height={height}
      lazyLoadEmojis
      skinTonesDisabled
      searchPlaceholder="Emoji suchen"
      previewConfig={{ showPreview: false }}
      customEmojis={customEmojis}
      categories={CATEGORIES}
      onEmojiClick={(d: EmojiClickData) => onPick(d.isCustom ? `:${d.names[0]}:` : d.emoji)}
    />
  );
}
