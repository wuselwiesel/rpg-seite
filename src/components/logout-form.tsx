"use client";

import { logout } from "@/lib/actions/auth";

// Meldet ab und löscht dabei die auf dem Gerät gespeicherten Seiten (Offline-Speicher).
export function LogoutForm() {
  return (
    <form
      action={logout}
      onSubmit={() => {
        navigator.serviceWorker?.controller?.postMessage("clear-caches");
      }}
    >
      <button type="submit" className="text-sm text-muted transition hover:text-red-600 dark:hover:text-red-400">
        Abmelden
      </button>
    </form>
  );
}
