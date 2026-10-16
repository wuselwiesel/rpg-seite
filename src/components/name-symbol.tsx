import { CircleCheck } from "lucide-react";
import { EmojiText } from "./custom-emoji-provider";
import { BLUE_CHECK } from "@/lib/name-symbol";

// Das gewählte Zeichen neben einem Namen: Emoji, eigenes Emoji oder der blaue Haken (nicht das echte Siegel)
export function NameSymbol({ symbol }: { symbol: string }) {
  if (symbol === BLUE_CHECK) {
    return (
      <span title="Blauer Haken" aria-label="Blauer Haken" role="img" className="inline-flex shrink-0 items-center self-center text-sky-500">
        <CircleCheck className="h-[15px] w-[15px]" strokeWidth={2.25} />
      </span>
    );
  }
  return <EmojiText text={symbol} />;
}
