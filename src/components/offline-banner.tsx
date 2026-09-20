"use client";

import { useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

// Hinweis, wenn kein Netz da ist: bereits geöffnete Seiten bleiben lesbar.
export function OfflineBanner() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  if (online) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[80] flex items-center justify-center gap-2 bg-fg px-3 py-1.5 text-center text-xs text-app print:hidden"
      style={{ paddingTop: "max(0.375rem, env(safe-area-inset-top))" }}
    >
      <WifiOff className="h-3.5 w-3.5" strokeWidth={2} />
      Du bist offline. Schon geöffnete Seiten kannst du weiterlesen.
    </div>
  );
}
