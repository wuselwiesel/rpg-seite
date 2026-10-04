"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

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
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const toggle = (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
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
