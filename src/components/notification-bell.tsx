"use client";

import { notificationTail } from "@/lib/notification-text";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Bell, MessageCircle, MessageSquare, Heart, AtSign, UserPlus, Dices, Hourglass, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/format";
import type { AppNotification } from "@/lib/notifications";

function iconForType(type: string) {
  if (type === "chat_message") return <MessageCircle className="h-4 w-4" strokeWidth={2} />;
  if (type === "mention") return <AtSign className="h-4 w-4" strokeWidth={2} />;
  if (type === "comment") return <MessageSquare className="h-4 w-4" strokeWidth={2} />;
  if (type === "like") return <Heart className="h-4 w-4" strokeWidth={2} />;
  if (type === "roll") return <Dices className="h-4 w-4" strokeWidth={2} />;
  if (type === "new_scene") return <BookOpen className="h-4 w-4" strokeWidth={2} />;
  if (type === "turn") return <Hourglass className="h-4 w-4" strokeWidth={2} />;
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
  const panelRef = useRef<HTMLDivElement>(null);
  const instanceId = useId();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`notifications-${userId}-${instanceId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as AppNotification;
          setNotifications((prev) => (prev.some((n) => n.id === row.id) ? prev : [row, ...prev].slice(0, 20)));
          setUnreadCount((prev) => prev + 1);
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

    // Zusätzliches Polling als Fallback: die Realtime-Verbindung liefert INSERTs
    // nicht immer zuverlässig aus (z.B. nach WLAN-Wechsel oder langer Inaktivität
    // des Tabs), sodass neue Benachrichtigungen sonst erst nach einem manuellen
    // Reload auftauchen würden.
    const pollForNew = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20)
        .returns<AppNotification[]>();
      if (!data) return;
      setNotifications((prev) => {
        const knownIds = new Set(prev.map((n) => n.id));
        const merged = [...data.filter((n) => !knownIds.has(n.id)), ...prev];
        return merged
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .slice(0, 20);
      });
      setUnreadCount(data.filter((n) => !n.read_at).length);
    };
    const interval = setInterval(pollForNew, 20_000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [userId, instanceId]);

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
          <span
            aria-label={`${unreadCount} neue Benachrichtigungen`}
            className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-strong px-1 text-[10px] font-semibold text-on-accent-strong"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-[calc(env(safe-area-inset-top,0px)+3.75rem)] z-50 rounded-2xl border border-line bg-surface shadow-lg lg:absolute lg:inset-x-auto lg:left-0 lg:top-full lg:mt-2 lg:w-80">
          <div className="border-b border-line px-4 py-3">
            <p className="font-serif text-lg text-fg">Benachrichtigungen</p>
          </div>
          <div className="max-h-[70dvh] overflow-y-auto lg:max-h-96">
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
                      <span className="font-medium text-fg">{n.actor_name ?? "Jemand"}</span>
                      {notificationTail(n.actor_count, n.message)}
                    </span>
                    {n.recipient_name && (
                      <span className="mt-0.5 block text-xs text-muted">für {n.recipient_name}</span>
                    )}
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
