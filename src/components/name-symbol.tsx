import { CircleCheck } from "lucide-react";
import { EmojiText } from "./custom-emoji-provider";
import { checkColor, isCheckSymbol } from "@/lib/name-symbol";

// Das gewählte Zeichen neben einem Namen: Emoji, eigenes Emoji oder der Haken in frei gewählter Farbe (nicht das echte Siegel)
export function NameSymbol({ symbol }: { symbol: string }) {
  if (isCheckSymbol(symbol)) {
    return (
      <span title="Haken" aria-label="Haken" role="img" className="inline-flex shrink-0 items-center self-center" style={{ color: checkColor(symbol) }}>
        <CircleCheck className="h-[15px] w-[15px]" strokeWidth={2.25} />
      </span>
    );
  }
  return <EmojiText text={symbol} />;
}
