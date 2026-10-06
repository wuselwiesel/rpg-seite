"use client";

import { Quote } from "lucide-react";
import { highlightEntries } from "@/lib/scene-quote";
import type { ChatQuote } from "@/lib/clips";

// Zitat aus der Szene im Szenen-Chat: Titel und Textanfänge; ein Klick springt zu den Nachrichten in der Szene.
export function QuoteCard({ quote, compact = false, className = "" }: { quote: ChatQuote; compact?: boolean; className?: string }) {
  const items = compact ? quote.items.slice(0, 2) : quote.items;
  const more = quote.entryIds.length - items.length;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        highlightEntries(quote.entryIds);
      }}
      title="Zur Szene springen"
      className={`block w-full rounded-lg border-l-2 border-current/50 bg-black/10 px-2 py-1 text-left text-xs ${className}`}
    >
      {quote.title && (
        <span className="mb-0.5 flex items-center gap-1 font-semibold">
          <Quote className="h-3 w-3 shrink-0" strokeWidth={2} />
          <span className="truncate">{quote.title}</span>
        </span>
      )}
      {items.map((item, i) => (
        <span key={i} className="block">
          <span className="font-semibold">{item.author}: </span>
          <span className={`opacity-90 ${compact ? "line-clamp-1" : "line-clamp-3"}`}>{item.text}</span>
        </span>
      ))}
      {more > 0 && <span className="block opacity-70">+ {more} weitere</span>}
    </button>
  );
}
