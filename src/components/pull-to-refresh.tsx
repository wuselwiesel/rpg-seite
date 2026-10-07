"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, RefreshCw } from "lucide-react";

const THRESHOLD = 70;

// Runterziehen am Seitenanfang lädt neu (nur Touch-Geräte).
export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const [isPending, startTransition] = useTransition();
  const start = useRef<number | null>(null);
  const pullRef = useRef(0);

  useEffect(() => {
    function onStart(e: TouchEvent) {
      start.current = window.scrollY <= 0 ? e.touches[0].clientY : null;
    }
    function onMove(e: TouchEvent) {
      if (start.current === null) return;
      const dy = e.touches[0].clientY - start.current;
      if (dy <= 0 || window.scrollY > 0) {
        pullRef.current = 0;
        setPull(0);
        return;
      }
      pullRef.current = Math.min(dy * 0.5, 110);
      setPull(pullRef.current);
    }
    function onEnd() {
      const reached = pullRef.current >= THRESHOLD;
      start.current = null;
      pullRef.current = 0;
      setPull(0);
      if (reached) startTransition(() => router.refresh());
    }
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    // Bricht iOS die Berührung ab (z. B. durch eine Systemgeste oder einen Fokuswechsel), kommt kein touchend:
    // ohne diese Zeilen bliebe die Seite um den Ziehweg nach unten verschoben.
    function onCancel() {
      start.current = null;
      pullRef.current = 0;
      setPull(0);
    }
    window.addEventListener("touchcancel", onCancel);
    window.addEventListener("pagehide", onCancel);
    return () => {
      window.removeEventListener("touchcancel", onCancel);
      window.removeEventListener("pagehide", onCancel);
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [router]);

  const visible = pull > 8 || isPending;
  return (
    <div>
      <div
        aria-hidden={!visible}
        className="pointer-events-none flex items-center justify-center overflow-hidden text-muted transition-[height] duration-150 lg:hidden"
        style={{ height: isPending ? 40 : pull > 0 ? pull * 0.6 : 0 }}
      >
        {isPending ? (
          <RefreshCw className="h-5 w-5 animate-spin" strokeWidth={2} />
        ) : (
          <ArrowDown
            className="h-5 w-5 transition-transform"
            strokeWidth={2}
            style={{ transform: `rotate(${pull >= THRESHOLD ? 180 : 0}deg)` }}
          />
        )}
      </div>
      {children}
    </div>
  );
}
