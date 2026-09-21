"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { savePushSubscription } from "@/app/push/actions";

export const PUSH_CLAIM_KEY = "wortwinkel:push-claimed";

// Ordnet das Push-Abo dieses Geräts dem aktuell angemeldeten Konto zu. Ohne das würde ein Gerät nach einem
// Kontowechsel weiter die Benachrichtigungen des vorherigen Kontos erhalten.
export function PushSync() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/login" || pathname === "/signup") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    try {
      if (sessionStorage.getItem(PUSH_CLAIM_KEY)) return;
    } catch {
      /* Speicher gesperrt: dann eben bei jeder Seite */
    }
    let cancelled = false;
    (async () => {
      if (Notification.permission !== "granted") return;
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub || cancelled) return;
      const error = await savePushSubscription(sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } });
      // "Nicht angemeldet" heißt nur: später erneut versuchen.
      if (!error) {
        try {
          sessionStorage.setItem(PUSH_CLAIM_KEY, "1");
        } catch {
          /* egal */
        }
      }
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
