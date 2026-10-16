import { EmojiText } from "./custom-emoji-provider";
import { checkColor, isCheckSymbol } from "@/lib/name-symbol";

// Das gewählte Zeichen neben einem Namen: Emoji, eigenes Emoji oder der Haken in frei gewählter Farbe (nicht das echte Siegel)
export function NameSymbol({ symbol }: { symbol: string }) {
  if (isCheckSymbol(symbol)) {
    return (
      <span title="Haken" aria-label="Haken" role="img" className="inline-flex shrink-0 items-center self-center" style={{ color: checkColor(symbol) }}>
        {/* Gefüllter Kreis in der gewählten Farbe mit weißem Haken (das echte Siegel ist dagegen gezackt und nur eine Kontur) */}
        <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" aria-hidden>
          <circle cx="12" cy="12" r="11" fill="currentColor" />
          <path d="M7 12.5l3.2 3.2L17 8.8" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  return <EmojiText text={symbol} />;
}
