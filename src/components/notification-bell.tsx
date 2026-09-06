"use client";

import { useState, useSyncExternalStore } from "react";
import { Bell } from "lucide-react";

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
      className="flex h-9 w-9 items-center justify-center rounded-full text-fg-soft transition hover:bg-surface-2 hover:text-fg"
    >
      <Bell className="h-[18px] w-[18px]" strokeWidth={2} />
    </button>
  );
}
