"use client";

import { Quote } from "lucide-react";
import { highlightEntries } from "@/lib/scene-quote";
import type { ChatQuote } from "@/lib/clips";

// Zitat aus der Szene im Szenen-Chat: Titel und Textanfänge; ein Klick springt zu den Nachrichten in der Szene.
export function QuoteCard({ quote, compact = false, className = "" }: { quote: ChatQuote; compact?: boolean; className?: string }) {
  const items = compact ? quote.items.slice(0, 2) : quote.items;
  const more = quote.entryIds.length - items.length;
  // Markierter Textausschnitt: wie ein Zitat gesetzt, mit Anführungszeichen und Quellenangabe
  if (quote.excerpt) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          highlightEntries(quote.entryIds);
        }}
        title="Zur Szene springen"
        className={`block w-full rounded-lg border-l-4 border-current/60 bg-black/10 px-2.5 py-1.5 text-left ${className}`}
      >
        {items.map((item, i) => (
          <span key={i} className={`block ${i > 0 ? "mt-1.5" : ""}`}>
            <span className={`block font-serif text-[13px] italic leading-snug ${compact ? "line-clamp-2" : "line-clamp-6"}`}>
              <Quote className="mr-1 inline h-3 w-3 -translate-y-px opacity-70" strokeWidth={2} aria-hidden />
              „{item.text}“
            </span>
            <span className="mt-0.5 block text-[11px] font-semibold opacity-80">— {item.author}</span>
          </span>
        ))}
        {more > 0 && <span className="mt-1 block text-[11px] opacity-70">+ {more} weitere</span>}
      </button>
    );
  }
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
