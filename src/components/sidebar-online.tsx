"use client";

import { useOnline } from "@/components/online-status";
import { MemberList, type OnlineMember } from "@/components/online-list";

// Seitenleiste am Laptop: Mitgliederliste der Welt, ruhig und immer sichtbar (nur die Gruppen „Online“ und „Offline“, keine Überschrift)
export function SidebarOnline({ members, selfId }: { members: OnlineMember[]; selfId: string }) {
  const { enabled } = useOnline();
  if (!enabled || members.length === 0) return null;
  return (
    <section aria-label="Mitglieder" className="mt-2 flex max-h-[40%] min-h-0 shrink-0 flex-col border-t border-line pt-1">
      <MemberList members={members} selfId={selfId} className="min-h-0 overflow-y-auto" />
    </section>
  );
}
