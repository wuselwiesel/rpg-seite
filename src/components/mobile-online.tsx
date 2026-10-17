"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Users } from "lucide-react";
import { useOnline } from "@/components/online-status";
import { MemberList, useOnlineMembers, type OnlineMember } from "@/components/online-list";

// Handy: Punkt in der Kopfzeile (grün = jemand online, grau = niemand); Antippen öffnet die Mitgliederliste von unten
export function MobileOnline({ members, selfId, variant = "icon", onOpen }: { members: OnlineMember[]; selfId: string; variant?: "icon" | "row"; onOpen?: () => void }) {
  const { enabled } = useOnline();
  const online = useOnlineMembers(members, selfId);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open]);

  if (!enabled || members.length === 0) return null;
  const label = online.length > 0 ? `Online: ${online.map((m) => m.name).join(", ")}` : "Mitglieder";
  const openList = () => {
    onOpen?.();
    setOpen(true);
  };
  return (
    <>
      {variant === "row" ? (
        <button type="button" onClick={openList} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] font-medium text-fg-soft transition hover:bg-surface-2 hover:text-fg">
          <span className="relative flex h-[18px] w-[18px] shrink-0 items-center justify-center">
            <Users className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
            <span aria-hidden className={`absolute -bottom-0.5 -right-1 h-2.5 w-2.5 rounded-full ring-2 ring-surface ${online.length > 0 ? "bg-emerald-500" : "bg-fg/30"}`} />
          </span>
          <span className="flex-1">Mitglieder</span>
          {online.length > 0 && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">{online.length} online</span>}
        </button>
      ) : (
      <button type="button" onClick={openList} aria-label={label} title={label} className="relative flex h-9 w-9 items-center justify-center rounded-full text-fg-soft transition hover:bg-surface-2 hover:text-fg">
        <Users className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
        <span aria-hidden className={`absolute bottom-1.5 right-1 h-2.5 w-2.5 rounded-full ring-2 ring-app ${online.length > 0 ? "bg-emerald-500" : "bg-fg/30"}`} />
      </button>
      )}
      {/* Über der Kopfzeile und der unteren Leiste (eigene Ebene am Seitenende), sonst schneidet die untere Leiste das Blatt ab */}
      {open &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[60] bg-black/40" onClick={() => setOpen(false)} aria-hidden />
            <div
              role="dialog"
              aria-label="Mitglieder"
              className="fixed inset-x-0 bottom-0 z-[70] flex max-h-[75dvh] flex-col rounded-t-3xl border-t border-line bg-surface p-4 shadow-lg"
              style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
            >
              <div className="mb-1 flex items-center gap-2">
                <h2 className="flex-1 text-sm font-medium text-muted">Mitglieder</h2>
                <button type="button" onClick={() => setOpen(false)} aria-label="Schließen" className="rounded-full p-1.5 text-muted transition hover:bg-surface-2 hover:text-fg">
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
              <MemberList members={members} selfId={selfId} className="min-h-0 overflow-y-auto" />
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
