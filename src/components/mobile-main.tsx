"use client";

import { useSyncExternalStore, ViewTransition } from "react";
import { usePathname } from "next/navigation";
import { isImmersiveChatPath } from "@/lib/immersive-routes";

function subscribeVisibility(callback: () => void) {
  document.addEventListener("visibilitychange", callback);
  return () => document.removeEventListener("visibilitychange", callback);
}

export function MobileMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const immersive = isImmersiveChatPath(pathname);
  // Übergänge nur, solange die Seite sichtbar ist: Bei einem Hintergrund-Tab würde der Browser die
  // View Transition nie abschließen und Hydration/Navigation bliebe hängen. Beim ersten Rendern aus.
  const visible = useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState === "visible",
    () => false,
  );

  return (
    <main
      className={`min-w-0 flex-1 ${immersive ? "" : "pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0"}`}
    >
      {/* Weicher Übergang zwischen Seiten (View Transitions API; ohne Browser-Support einfach ohne Animation). */}
      <ViewTransition default={visible ? "page-fade" : "none"}>{children}</ViewTransition>
    </main>
  );
}
