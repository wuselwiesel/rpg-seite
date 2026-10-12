"use client";

import { useOnline } from "@/components/online-status";
import { OnlineList, useOnlineMembers, type OnlineMember } from "@/components/online-list";

// Seitenleiste am Laptop: immer sichtbar, wer aus der Welt online ist
export function SidebarOnline({ members, selfId }: { members: OnlineMember[]; selfId: string }) {
  const { enabled } = useOnline();
  const online = useOnlineMembers(members, selfId);
  if (!enabled || members.filter((m) => m.id !== selfId).length === 0) return null;
  return (
    <section aria-label="Online" className="mt-2 max-h-48 shrink-0 overflow-y-auto rounded-xl bg-surface-2/60 px-1 py-2">
      <h2 className="mb-1 flex items-center gap-1.5 px-2 text-xs font-medium text-muted">
        <span aria-hidden className={`h-2 w-2 rounded-full ${online.length > 0 ? "bg-emerald-500" : "bg-fg/30"}`} />
        Online{online.length > 0 ? ` · ${online.length}` : ""}
      </h2>
      <OnlineList members={members} selfId={selfId} />
    </section>
  );
}
