"use client";

import { createContext, useContext } from "react";
import { emojiHtml, splitEmojiText, type EmojiMap } from "@/lib/custom-emoji";

const EmojiContext = createContext<EmojiMap>({});

export function CustomEmojiProvider({ map, children }: { map: EmojiMap; children: React.ReactNode }) {
  return <EmojiContext.Provider value={map}>{children}</EmojiContext.Provider>;
}

export function useEmojiMap(): EmojiMap {
  return useContext(EmojiContext);
}

// HTML mit :name: -> Bild (Client-Komponenten); Server-Seiten nutzen getEmojiMap() + emojiHtml().
export function useEmojiHtml(html: string): string {
  return emojiHtml(html, useContext(EmojiContext));
}

// Klartext mit :name: -> Text und Emoji-Bilder.
// `chat`: größer für Chat-Nachrichten; besteht die Nachricht nur aus (höchstens 8) Emojis, werden sie groß gezeigt.
export function EmojiText({ text, chat = false, alone = true }: { text: string; chat?: boolean; alone?: boolean }) {
  const map = useContext(EmojiContext);
  const parts = splitEmojiText(text, map);
  if (parts.length === 1 && typeof parts[0] === "string") return <>{parts[0]}</>;
  const emojiCount = parts.filter((p) => typeof p !== "string").length;
  const onlyEmoji = chat && alone && emojiCount <= 8 && parts.every((p) => typeof p !== "string" || !p.trim());
  const cls = !chat ? "custom-emoji" : onlyEmoji ? "custom-emoji custom-emoji-jumbo" : "custom-emoji custom-emoji-chat";
  return (
    <>
      {parts.map((p, i) =>
        typeof p === "string" ? (
          <span key={i}>{p}</span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={p.url} alt={`:${p.name}:`} title={`:${p.name}:`} className={cls} draggable={false} />
        ),
      )}
    </>
  );
}

// Div mit gerendertem HTML, in dem :name: durch Emoji-Bilder ersetzt wird.
export function EmojiHtml({ html, className }: { html: string; className?: string }) {
  const rendered = useEmojiHtml(html);
  return <div className={className} dangerouslySetInnerHTML={{ __html: rendered }} />;
}
