import type { ChatQuote } from "@/lib/clips";

// Woher ein Zitat im Szenen-Chat stammt: einzelne Nachrichten der Szene oder ein gespeicherter Ausschnitt.
// Der Server baut daraus selbst die Kopie des Wortlauts (der Client kann also nichts Falsches unterschieben).
export type QuoteSource = { storyPostId: string; entryIds: string[] } | { clipId: string };

// Vorschau fürs Eingabefeld (quote) plus Quelle fürs Senden (source)
export type QuoteDraft = { source: QuoteSource; quote: ChatQuote };

export const QUOTE_EVENT = "wortwinkel-quote";
export const HIGHLIGHT_EVENT = "wortwinkel-highlight";

// Zitat ins Chat-Eingabefeld der Szene legen (die Szene wechselt auf den Reiter „Chat“)
export function requestQuote(draft: QuoteDraft) {
  window.dispatchEvent(new CustomEvent<QuoteDraft>(QUOTE_EVENT, { detail: draft }));
}

// Nachrichten der Szene anspringen und hervorheben
export function highlightEntries(ids: string[]) {
  window.dispatchEvent(new CustomEvent<string[]>(HIGHLIGHT_EVENT, { detail: ids }));
}
