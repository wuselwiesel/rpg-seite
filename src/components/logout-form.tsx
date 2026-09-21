"use client";

import { useRef } from "react";
import { logout } from "@/lib/actions/auth";
import { removePushSubscription } from "@/app/push/actions";
import { PUSH_CLAIM_KEY } from "./push-sync";

// Meldet ab und löscht dabei die auf dem Gerät gespeicherten Seiten (Offline-Speicher).
export function LogoutForm() {
  const released = useRef(false);

  return (
    <form
      action={logout}
      onSubmit={async (e) => {
        if (released.current) return;
        // Erst das Push-Abo dieses Geräts vom Konto lösen, dann abmelden.
        e.preventDefault();
        const form = e.currentTarget;
        try {
          const reg = await navigator.serviceWorker?.getRegistration();
          const sub = await reg?.pushManager.getSubscription();
          if (sub) await Promise.race([removePushSubscription(sub.endpoint), new Promise((r) => setTimeout(r, 2500))]);
          sessionStorage.removeItem(PUSH_CLAIM_KEY);
        } catch {
          /* Abmelden hat Vorrang */
        }
        navigator.serviceWorker?.controller?.postMessage("clear-caches");
        released.current = true;
        form.requestSubmit();
      }}
    >
      <button type="submit" className="text-sm text-muted transition hover:text-red-600 dark:hover:text-red-400">
        Abmelden
      </button>
    </form>
  );
}
