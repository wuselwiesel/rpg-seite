"use client";

import { useEffect, useState } from "react";
import { savePushSubscription, removePushSubscription } from "@/app/push/actions";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

type Status = "unsupported" | "loading" | "off" | "on" | "denied";

export function PushSubscribeToggle() {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.resolve().then(async () => {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      ) {
        if (!cancelled) setStatus("unsupported");
        return;
      }

      if (Notification.permission === "denied") {
        if (!cancelled) setStatus("denied");
        return;
      }

      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!cancelled) setStatus(sub ? "on" : "off");
      } catch {
        if (!cancelled) setStatus("unsupported");
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    setError(null);
    setStatus("loading");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });

      const saveError = await savePushSubscription(subscription.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      });
      if (saveError) {
        setError(saveError);
        setStatus("off");
        return;
      }

      setStatus("on");
    } catch {
      setError("Push-Benachrichtigungen konnten nicht aktiviert werden.");
      setStatus("off");
    }
  }

  async function disable() {
    setError(null);
    setStatus("loading");
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        await removePushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setStatus("off");
    } catch {
      setError("Push-Benachrichtigungen konnten nicht deaktiviert werden.");
      setStatus("on");
    }
  }

  if (status === "unsupported") return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-fg">Push-Benachrichtigungen</p>
          <p className="text-xs text-muted">
            Erhalte Benachrichtigungen auch, wenn Chronik nicht offen ist.
          </p>
        </div>
        {status === "denied" ? (
          <span className="shrink-0 text-xs text-muted">In den Browser-Einstellungen blockiert</span>
        ) : (
          <button
            type="button"
            disabled={status === "loading"}
            onClick={status === "on" ? disable : enable}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition disabled:opacity-50 ${
              status === "on"
                ? "border-line text-fg-soft hover:border-red-500 hover:text-red-600 dark:hover:text-red-400"
                : "border-line text-fg-soft hover:border-accent hover:text-accent"
            }`}
          >
            {status === "loading" ? "..." : status === "on" ? "Deaktivieren" : "Aktivieren"}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
