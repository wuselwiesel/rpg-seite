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

// Next behält beim Seitenwechsel die vorige Ansicht versteckt im Hintergrund (gleiche IDs zweimal): nur sichtbare Nachrichten zählen
export function visibleEntryElement(entryId: string): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>(`[id="beitrag-${CSS.escape(entryId)}"]`);
  return Array.from(all).find((el) => el.offsetParent !== null) ?? null;
}

// IDs aller sichtbaren Nachrichten in Lesereihenfolge
export function visibleEntryIds(): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const el of document.querySelectorAll<HTMLElement>('[id^="beitrag-"]')) {
    if (el.offsetParent === null) continue;
    const id = el.id.slice("beitrag-".length);
    if (!seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}
