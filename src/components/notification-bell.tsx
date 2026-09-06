"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Bell, MessageCircle, AtSign, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/format";
import type { AppNotification } from "@/lib/notifications";

function subscribePermission() {
  return () => {};
}
function getPermissionSnapshot(): NotificationPermission | "unsupported" {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}
function getServerPermissionSnapshot(): NotificationPermission | "unsupported" {
  return "unsupported";
}

function iconForType(type: string) {
  if (type === "chat_message") return <MessageCircle className="h-4 w-4" strokeWidth={2} />;
  if (type === "mention") return <AtSign className="h-4 w-4" strokeWidth={2} />;
  return <UserPlus className="h-4 w-4" strokeWidth={2} />;
}

export function NotificationBell({
  userId,
  initialNotifications,
  initialUnreadCount,
}: {
  userId: string;
  initialNotifications: AppNotification[];
  initialUnreadCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [, forcePermissionRerender] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const permission = useSyncExternalStore(
    subscribePermission,
    getPermissionSnapshot,
    getServerPermissionSnapshot,
  );

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as AppNotification;
          setNotifications((prev) => [row, ...prev].slice(0, 20));
          setUnreadCount((prev) => prev + 1);

          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification(row.actor_name ? `${row.actor_name} ${row.message}` : row.message);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as AppNotification;
          setNotifications((prev) => prev.map((n) => (n.id === row.id ? row : n)));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function togglePanel() {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && unreadCount > 0) {
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })));
      const supabase = createClient();
      supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", userId)
        .is("read_at", null)
        .then();
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={togglePanel}
        title="Benachrichtigungen"
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-fg-soft transition hover:bg-surface-2 hover:text-fg"
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-strong px-1 text-[10px] font-semibold text-on-accent-strong">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full right-0 z-50 mb-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-serif text-lg text-fg">Benachrichtigungen</p>
            {permission === "default" && (
              <button
                type="button"
                onClick={async () => {
                  await Notification.requestPermission();
                  forcePermissionRerender((n) => n + 1);
                }}
                className="text-xs text-accent hover:underline"
              >
                Browser-Push aktivieren
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted">Noch keine Benachrichtigungen.</p>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n.id}
                  href={n.link}
                  onClick={() => setOpen(false)}
                  className={`flex gap-3 border-b border-line px-4 py-3 text-sm transition last:border-b-0 hover:bg-surface-2 ${
                    !n.read_at ? "bg-surface-2/60" : ""
                  }`}
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-3 text-fg-soft">
                    {iconForType(n.type)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-fg-soft">
                      <span className="font-medium text-fg">{n.actor_name ?? "Jemand"}</span> {n.message}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">{formatDateTime(n.created_at)}</span>
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
