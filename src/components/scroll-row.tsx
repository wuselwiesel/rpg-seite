"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function ScrollRow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [update]);

  function scrollBy(direction: 1 | -1) {
    ref.current?.scrollBy({ left: direction * (ref.current.clientWidth * 0.7), behavior: "smooth" });
  }

  const arrow =
    "absolute top-[28px] z-10 hidden h-7 w-7 items-center justify-center rounded-full border border-line bg-surface text-fg shadow-sm transition hover:bg-surface-2 md:flex";

  return (
    <div className="relative">
      <div
        ref={ref}
        onScroll={update}
        className={`flex gap-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
      >
        {children}
      </div>
      {canLeft && (
        <button type="button" onClick={() => scrollBy(-1)} aria-label="Zurück" className={`${arrow} left-1`}>
          <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
        </button>
      )}
      {canRight && (
        <button type="button" onClick={() => scrollBy(1)} aria-label="Weiter" className={`${arrow} right-1`}>
          <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
