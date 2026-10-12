"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useOnline } from "@/components/online-status";
import { MemberList, type OnlineMember } from "@/components/online-list";

const KEY = "members:collapsed";

// Seitenleiste am Laptop: Mitgliederliste der Welt, ruhig und immer erreichbar.
// Eine kleine, leise Zeile klappt sie ein und aus (zugeklappt zeigt sie nur einen grünen Punkt mit der Zahl der Online-Leute).
export function SidebarOnline({ members, selfId }: { members: OnlineMember[]; selfId: string }) {
  const { enabled, onlineIds } = useOnline();
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        if (localStorage.getItem(KEY) === "1") setCollapsed(true);
      } catch {
        // ohne Speicher bleibt die Liste offen
      }
    });
  }, []);
  if (!enabled || members.length === 0) return null;
  const online = members.filter((m) => onlineIds.has(m.id)).length;

  function toggle() {
    setCollapsed((v) => {
      try {
        localStorage.setItem(KEY, v ? "0" : "1");
      } catch {
        // ignorieren
      }
      return !v;
    });
  }

  return (
    <section aria-label="Mitglieder" className="mt-2 flex max-h-[40%] min-h-0 shrink-0 flex-col border-t border-line pt-1">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={!collapsed}
        aria-label={collapsed ? "Mitgliederliste aufklappen" : "Mitgliederliste zuklappen"}
        className="flex w-fit items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-muted transition hover:bg-surface-2 hover:text-fg"
      >
        <ChevronDown className={`h-3 w-3 shrink-0 transition ${collapsed ? "-rotate-90" : ""}`} strokeWidth={2} />
        {collapsed ? (
          <span className="flex items-center gap-1.5">
            <span aria-hidden className={`h-2 w-2 rounded-full ${online > 0 ? "bg-emerald-500" : "bg-fg/30"}`} />
            {online}
          </span>
        ) : (
          "Mitglieder"
        )}
      </button>
      {!collapsed && <MemberList members={members} selfId={selfId} className="min-h-0 overflow-y-auto" />}
    </section>
  );
}
