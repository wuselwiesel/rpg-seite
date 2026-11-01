"use client";

import { EmojiText } from "./custom-emoji-provider";
import { WikiIcon, isWikiIcon } from "./wiki-icon";
import { pageIconSymbol } from "@/lib/wiki-page-icon";

// Icon einer Wiki-Seite: das hochgeladene Bild oder das gewählte Symbol (Bibliothek oder Emoji), eingepasst in `className`.
export function WikiPageIcon({ value, alt = "", className = "", lazy = true }: { value: string; alt?: string; className?: string; lazy?: boolean }) {
  const symbol = pageIconSymbol(value);
  if (!symbol) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={value} alt={alt} loading={lazy ? "lazy" : undefined} decoding="async" className={`${className} object-contain`} />;
  }
  return (
    <span role={alt ? "img" : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true} className={`${className} inline-flex items-center justify-center text-accent-strong`} style={{ containerType: "size" }}>
      {isWikiIcon(symbol) ? (
        <WikiIcon name={symbol} aria-hidden className="h-[70%] w-[70%]" strokeWidth={1.5} />
      ) : (
        <span className="leading-none" style={{ fontSize: "70cqmin" }}>
          <EmojiText text={symbol} />
        </span>
      )}
    </span>
  );
}
