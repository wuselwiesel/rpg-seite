"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useOnline } from "@/components/online-status";
import { GroupToggle, MemberList, useGroupMode, useOnlineMembers, type OnlineMember } from "@/components/online-list";

// Handy: Punkt in der Kopfzeile (grün = jemand online, grau = niemand); Antippen öffnet die Mitgliederliste von unten
export function MobileOnline({ members, selfId }: { members: OnlineMember[]; selfId: string }) {
  const { enabled } = useOnline();
  const online = useOnlineMembers(members, selfId);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useGroupMode();

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open]);

  if (!enabled || members.length === 0) return null;
  const label = online.length > 0 ? `Online: ${online.map((m) => m.name).join(", ")}` : "Mitglieder";
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={label} title={label} className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-surface-2">
        <span aria-hidden className={`h-3 w-3 rounded-full ${online.length > 0 ? "bg-emerald-500" : "bg-fg/30"}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)} aria-hidden />
          <div
            role="dialog"
            aria-label="Mitglieder"
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[75dvh] flex-col rounded-t-3xl border-t border-line bg-surface p-4 shadow-lg"
            style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
          >
            <div className="mb-1 flex items-center gap-2">
              <h2 className="flex-1 text-base font-medium text-fg">Mitglieder — {members.length}</h2>
              <GroupToggle mode={mode} onChange={setMode} />
              <button type="button" onClick={() => setOpen(false)} aria-label="Schließen" className="rounded-full p-1.5 text-muted transition hover:bg-surface-2 hover:text-fg">
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
            <MemberList members={members} selfId={selfId} mode={mode} className="min-h-0 overflow-y-auto" />
          </div>
        </>
      )}
    </>
  );
}
