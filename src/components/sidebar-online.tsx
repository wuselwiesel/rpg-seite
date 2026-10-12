"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useOnline } from "@/components/online-status";
import { MemberList, type OnlineMember } from "@/components/online-list";

const KEY = "members:collapsed";

// Seitenleiste am Laptop: Mitgliederliste der Welt, immer sichtbar (einklappbar)
export function SidebarOnline({ members, selfId }: { members: OnlineMember[]; selfId: string }) {
  const { enabled } = useOnline();
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        if (localStorage.getItem(KEY) === "1") setCollapsed(true);
      } catch {
        // ignorieren
      }
    });
  }, []);
  if (!enabled || members.length === 0) return null;
  const toggle = () => {
    setCollapsed((v) => {
      try {
        localStorage.setItem(KEY, v ? "0" : "1");
      } catch {
        // ignorieren
      }
      return !v;
    });
  };
  return (
    <section aria-label="Mitglieder" className="mt-2 flex max-h-[45%] min-h-0 shrink-0 flex-col rounded-xl bg-surface-2/60 px-1 py-1.5">
      <div className="flex items-center gap-1 px-1">
        <button type="button" onClick={toggle} aria-expanded={!collapsed} className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium text-muted transition hover:text-fg">
          <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition ${collapsed ? "-rotate-90" : ""}`} strokeWidth={2} />
          Mitglieder — {members.length}
        </button>
      </div>
      {!collapsed && <MemberList members={members} selfId={selfId} className="min-h-0 overflow-y-auto" />}
    </section>
  );
}
