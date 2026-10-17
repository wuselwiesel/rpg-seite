"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { TicketKindChip, TicketStatusChip, ticketDate } from "@/components/ticket-chips";
import { STATUSES, isUnread, ticketNumber, type TicketKind, type TicketStatus } from "@/lib/tickets";

export type ListTicket = {
  id: string;
  number: number;
  kind: TicketKind;
  title: string;
  status: TicketStatus;
  mine: boolean;
  last_actor: string | null;
  updated_at: string;
  read_at: string | null;
  by: string;
};

// Liste des Postfachs mit Reitern, Filtern und Live-Aktualisierung des Stands
export function TicketListView({ tickets: initial, userId, admin }: { tickets: ListTicket[]; userId: string; admin: boolean }) {
  const pathname = usePathname();
  const openId = pathname?.match(/^\/redaktion\/tickets\/([0-9a-f-]{36})/)?.[1] ?? null;
  const [tickets, setTickets] = useState(initial);
  const [box, setBox] = useState<"mine" | "inbox">("mine");
  const [status, setStatus] = useState<"all" | TicketStatus>("all");

  // Neue Daten vom Server (nach einer Aktion) ersetzen den Stand
  const [seen, setSeen] = useState(initial);
  if (initial !== seen) {
    setSeen(initial);
    setTickets(initial);
  }

  // Live: Statuswechsel und Antworten ändern die Zeile sofort
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`tickets-list-${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tickets" }, (payload) => {
        const row = payload.new as { id: string; status: TicketStatus; title: string; last_actor: string | null; updated_at: string };
        setTickets((prev) => prev.map((t) => (t.id === row.id ? { ...t, status: row.status, title: row.title, last_actor: row.last_actor, updated_at: row.updated_at } : t)));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const counts = useMemo(() => {
    const m = { mine: 0, inbox: 0 };
    for (const t of tickets) if (isUnread(t, userId, t.read_at) && t.id !== openId) m[t.mine ? "mine" : "inbox"] += 1;
    return m;
  }, [tickets, userId, openId]);
  const visible = useMemo(
    () =>
      tickets
        .filter((t) => (box === "mine" ? t.mine : !t.mine) && (status === "all" || t.status === status))
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
    [tickets, box, status],
  );

  const chip = (active: boolean) => `rounded-full border px-3 py-1 text-sm transition ${active ? "border-accent bg-accent/10 font-medium text-accent" : "border-line text-fg-soft hover:border-accent hover:text-accent"}`;
  const dot = (n: number) => (n > 0 ? <span className="ml-1.5 rounded-full bg-accent px-1.5 text-xs font-semibold text-on-accent-strong">{n}</span> : null);

  return (
    <div className="flex flex-col gap-3 px-3">
      <div className="flex items-center justify-between gap-2 px-1">
        <h1 className="font-serif text-2xl text-fg">Tickets</h1>
        <Link href="/redaktion/tickets/new" className="flex items-center gap-1.5 rounded-full bg-accent-strong px-3.5 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90">
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Neu
        </Link>
      </div>

      {admin && (
        <div role="tablist" aria-label="Postfach" className="flex flex-wrap gap-1.5">
          <button type="button" role="tab" aria-selected={box === "mine"} onClick={() => setBox("mine")} className={chip(box === "mine")}>
            Erstellte Tickets{dot(counts.mine)}
          </button>
          <button type="button" role="tab" aria-selected={box === "inbox"} onClick={() => setBox("inbox")} className={chip(box === "inbox")}>
            Eingang{dot(counts.inbox)}
          </button>
        </div>
      )}
      {!admin && counts.mine > 0 && <p className="sr-only">{counts.mine} ungelesen</p>}

      <div role="tablist" aria-label="Stand" className="flex flex-wrap gap-1.5">
        {[{ key: "all" as const, label: "Alle" }, ...STATUSES].map((s) => (
          <button key={s.key} type="button" role="tab" aria-selected={status === s.key} onClick={() => setStatus(s.key)} className={chip(status === s.key)}>
            {s.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="px-1 text-sm text-muted">Keine Tickets.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {visible.map((t) => {
            const unread = isUnread(t, userId, t.read_at) && t.id !== openId;
            return (
              <li key={t.id}>
                <Link
                  href={`/redaktion/tickets/${t.id}`}
                  aria-current={t.id === openId ? "page" : undefined}
                  className={`flex flex-col gap-1 rounded-xl px-3 py-2.5 transition ${t.id === openId ? "bg-surface-2" : "hover:bg-surface-2/60"}`}
                >
                  <span className="flex items-center gap-2">
                    {unread && <span aria-label="Ungelesen" className="h-2 w-2 shrink-0 rounded-full bg-accent" />}
                    <span className="shrink-0 text-xs tabular-nums text-muted">{ticketNumber(t.number)}</span>
                    <span className={`min-w-0 flex-1 truncate text-[15px] ${unread ? "font-semibold text-fg" : "text-fg-soft"}`}>{t.title}</span>
                  </span>
                  <span className="flex flex-wrap items-center gap-1.5">
                    <TicketStatusChip status={t.status} />
                    <TicketKindChip kind={t.kind} />
                    <span className="text-xs text-muted">
                      {box === "inbox" ? `${t.by} · ` : ""}
                      {ticketDate(t.updated_at)}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
