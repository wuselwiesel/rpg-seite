"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { HIGHLIGHT_EVENT } from "@/lib/scene-quote";
import { EXPAND_EARLIER_EVENT } from "@/lib/scene-nav";
import { captureScrollAnchor, captureScrollElement } from "@/lib/keep-scroll";

// Frühere Beiträge einer Szene: standardmäßig eingeklappt, damit man direkt bei den neuesten ist.
export function EarlierEntries({ count, children }: { count: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const label = `${count} ${count === 1 ? "früherer Beitrag" : "frühere Beiträge"}`;

  // Kapitel-Links (#kapitel-N) und Links auf einen einzelnen Beitrag (#beitrag-…, z. B. aus dem Würfelverlauf) führen auch zu eingeklappten Beiträgen: dann erst aufklappen, dann hinscrollen.
  useEffect(() => {
    function reveal(id: string) {
      if (!id.startsWith("kapitel-") && !id.startsWith("beitrag-")) return;
      const target = ref.current?.querySelector(`#${CSS.escape(id)}`);
      if (!target) return;
      setOpen(true);
      // Einzelne Beiträge scrollt ScrollToEntry hin (und hebt sie hervor); Kapitel-Links scrollen hier.
      if (id.startsWith("kapitel-")) requestAnimationFrame(() => target.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
    function onClick(e: MouseEvent) {
      const a = (e.target as Element | null)?.closest?.('a[href^="#kapitel-"], a[href^="#beitrag-"]');
      if (a) reveal(a.getAttribute("href")!.slice(1));
    }
    if (location.hash) reveal(location.hash.slice(1));
    // Zitat im Szenen-Chat angeklickt: auch dann aufklappen, wenn die Nachricht weiter oben eingeklappt liegt
    function onHighlight(e: Event) {
      const first = (e as CustomEvent<string[]>).detail?.[0];
      if (first) reveal(`beitrag-${first}`);
    }
    // „Zum Anfang“: aufklappen, damit die erste Nachricht sichtbar ist (nur die Liste der sichtbaren Szene)
    function onExpand() {
      if (ref.current?.parentElement?.offsetParent) setOpen(true);
    }
    document.addEventListener("click", onClick);
    window.addEventListener(HIGHLIGHT_EVENT, onHighlight);
    window.addEventListener(EXPAND_EARLIER_EVENT, onExpand);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener(HIGHLIGHT_EVENT, onHighlight);
      window.removeEventListener(EXPAND_EARLIER_EVENT, onExpand);
    };
  }, []);

  // Beim Ein- und Ausklappen bleibt die Lesestelle, wo sie ist (wird nach dem Rendern, noch vor dem nächsten Bild, wiederhergestellt):
  // beim Einblenden der erste sichtbare spätere Beitrag, beim Ausblenden über den oberen Knopf dieser Knopf,
  // über den unteren Knopf (der dabei verschwindet) rückt der obere ins Bild.
  const restoreRef = useRef<(() => void) | null>(null);
  useLayoutEffect(() => {
    restoreRef.current?.();
    restoreRef.current = null;
  }, [open]);

  function flip(e: React.MouseEvent<HTMLButtonElement>) {
    if (!open) {
      restoreRef.current = captureScrollAnchor(
        Array.from(document.querySelectorAll<HTMLElement>("#beitragsliste [id^='beitrag-'], #beitragsliste [id^='kapitel-']"))
          .filter((el) => !ref.current?.contains(el))
          .map((el) => el.id),
      );
      setOpen(true);
      return;
    }
    const topToggle = ref.current?.previousElementSibling as HTMLElement | null;
    if (topToggle && topToggle !== e.currentTarget) {
      restoreRef.current = () => topToggle.scrollIntoView({ block: "center" });
    } else restoreRef.current = captureScrollElement(e.currentTarget);
    setOpen(false);
  }

  const toggle = (
    <button
      type="button"
      onClick={flip}
      aria-expanded={open}
      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line bg-surface px-4 py-2.5 text-sm text-fg-soft transition hover:bg-surface-2 hover:text-fg active:scale-[0.99]"
    >
      {open ? <ChevronUp className="h-4 w-4" strokeWidth={2} /> : <ChevronDown className="h-4 w-4" strokeWidth={2} />}
      {open ? `${label} ausblenden` : `${label} einblenden`}
    </button>
  );

  return (
    <>
      {toggle}
      <div ref={ref} hidden={!open} className="flex flex-col gap-4">
        {children}
      </div>
      {open && count > 3 && toggle}
    </>
  );
}
