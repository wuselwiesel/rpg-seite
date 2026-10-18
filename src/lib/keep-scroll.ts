// Beim Nachladen früherer Nachrichten die Lesestelle halten: ein Element merken, vor dem Einfügen seine Lage lesen
// und danach so weit scrollen, dass es an derselben Stelle des Bildschirms steht (egal ob Fenster oder Liste scrollt).
function scrollParent(el: HTMLElement): HTMLElement {
  let p = el.parentElement;
  while (p) {
    const oy = getComputedStyle(p).overflowY;
    if ((oy === "auto" || oy === "scroll") && p.scrollHeight > p.clientHeight) return p;
    p = p.parentElement;
  }
  return (document.scrollingElement as HTMLElement) ?? document.documentElement;
}

// Next behält beim Seitenwechsel die vorige Ansicht versteckt im Hintergrund (gleiche IDs zweimal): nur das sichtbare Element zählt.
function visibleById(id: string): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>(`[id="${CSS.escape(id)}"]`);
  return Array.from(all).find((el) => el.offsetParent !== null) ?? null;
}

// `elementIds` in Lesereihenfolge: gemerkt wird das erste, das gerade im Bild (oder darunter) steht.
export function keepScrollAnchor(elementIds: string[]): () => void {
  let elementId = elementIds[0];
  let top: number | undefined;
  for (const id of elementIds) {
    const el = visibleById(id);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.bottom > 0) {
      elementId = id;
      top = r.top;
      break;
    }
  }
  // Die neuen Nachrichten erscheinen erst nach dem nächsten Rendern: kurz abwarten (bis zu einer Sekunde), bis sich die Lage ändert.
  return () => {
    if (top === undefined) return;
    let tries = 0;
    const step = () => {
      const el = visibleById(elementId);
      if (el) {
        const diff = el.getBoundingClientRect().top - top;
        if (Math.abs(diff) > 1) {
          scrollParent(el).scrollTop += diff;
          return;
        }
      }
      if (++tries < 40) window.setTimeout(step, 25);
    };
    window.setTimeout(step, 0);
  };
}

// Ein bestimmtes Element (zum Beispiel den angetippten Knopf) an derselben Stelle des Bildschirms halten, wenn sich darüber etwas ein- oder ausklappt.
export function keepScrollElement(el: HTMLElement): () => void {
  const top = el.getBoundingClientRect().top;
  return () => {
    let tries = 0;
    const step = () => {
      if (el.isConnected) {
        const diff = el.getBoundingClientRect().top - top;
        if (Math.abs(diff) > 1) {
          scrollParent(el).scrollTop += diff;
          return;
        }
      }
      if (++tries < 40) window.setTimeout(step, 25);
    };
    window.setTimeout(step, 0);
  };
}
