"use client";

import { useEffect, useRef, useState } from "react";
import { useOnline } from "@/components/online-status";
import { OnlineList, useOnlineMembers, type OnlineMember } from "@/components/online-list";

// Handy: Punkt in der Kopfzeile (grün = jemand online, grau = niemand); Antippen zeigt die Liste
export function MobileOnline({ members, selfId }: { members: OnlineMember[]; selfId: string }) {
  const { enabled } = useOnline();
  const online = useOnlineMembers(members, selfId);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  if (!enabled || members.filter((m) => m.id !== selfId).length === 0) return null;
  const label = online.length > 0 ? `Online: ${online.map((m) => m.name).join(", ")}` : "Niemand online";
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={label}
        title={label}
        className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-surface-2"
      >
        <span aria-hidden className={`h-3 w-3 rounded-full ${online.length > 0 ? "bg-emerald-500" : "bg-fg/30"}`} />
      </button>
      {open && (
        <div onClick={() => setOpen(false)} className="absolute right-0 top-full z-40 mt-1 max-h-[60dvh] w-64 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-line bg-surface p-1.5 shadow-lg">
          <OnlineList members={members} selfId={selfId} />
        </div>
      )}
    </div>
  );
}
