"use client";

import { useState, useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

function getSnapshot(): NotificationPermission | "unsupported" {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

function getServerSnapshot(): NotificationPermission | "unsupported" {
  return "unsupported";
}

export function NotificationBell() {
  const permission = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [, forceRerender] = useState(0);

  if (permission === "unsupported" || permission === "granted") return null;

  return (
    <button
      type="button"
      onClick={async () => {
        await Notification.requestPermission();
        forceRerender((n) => n + 1);
      }}
      title="Benachrichtigungen bei neuen Nachrichten aktivieren"
      className="text-sm text-stone-400 hover:text-amber-400"
    >
      🔔
    </button>
  );
}
