"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Flag, Inbox, Plus, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { StatusDot } from "@/components/ticket-chips";
import {
  CATEGORY_LABEL,
  GROUPS,
  KIND_LABEL,
  STATUS_LABEL,
  groupOf,
  isUnread,
  matchesQuery,
  shortWhen,
  sortTickets,
  ticketNumber,
  type TicketCategory,
  type TicketGroupKey,
  type TicketKind,
  type TicketStatus,
} from "@/lib/tickets";

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
  urgent: boolean;
  category: TicketCategory | null;
};

// Liste des Postfachs: nach Stand gruppiert, mit Suche und (für die Betreiberin) Eingang/Meine, Live-Aktualisierung des Stands
export function TicketListView({ tickets: initial, userId, admin }: { tickets: ListTicket[]; userId: string; admin: boolean }) {
  const pathname = usePathname();
  const openId = pathname?.match(/^\/redaktion\/tickets\/([0-9a-f-]{36})/)?.[1] ?? null;
  const [tickets, setTickets] = useState(initial);
  const [box, setBox] = useState<"mine" | "inbox">(admin ? "inbox" : "mine");
  const [query, setQuery] = useState("");
  const [closedOpen, setClosedOpen] = useState(false);

  // Neue Daten vom Server (nach einer Aktion) ersetzen den Stand
  const [seen, setSeen] = useState(initial);
  if (initial !== seen) {
    setSeen(initial);
    setTickets(initial);
  }

  // Live: Statuswechsel, Einordnung und Antworten ändern die Zeile sofort
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`tickets-list-${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tickets" }, (payload) => {
        const row = payload.new as Pick<ListTicket, "id" | "status" | "title" | "last_actor" | "updated_at" | "urgent" | "category">;
        setTickets((prev) =>
          prev.map((t) => (t.id === row.id ? { ...t, status: row.status, title: row.title, last_actor: row.last_actor, updated_at: row.updated_at, urgent: row.urgent, category: row.category } : t)),
        );
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

  const inBox = useMemo(() => tickets.filter((t) => (admin && box === "inbox" ? !t.mine : t.mine)), [tickets, box, admin]);
  const visible = useMemo(() => inBox.filter((t) => matchesQuery(t, query)), [inBox, query]);
  const groups = useMemo(() => {
    const by: Record<TicketGroupKey, ListTicket[]> = { open: [], working: [], closed: [] };
    for (const t of visible) by[groupOf(t.status)].push(t);
    return GROUPS.map((g) => ({ ...g, items: sortTickets(by[g.key]) })).filter((g) => g.items.length > 0);
  }, [visible]);

  const searching = query.trim().length > 0;
  const seg = (active: boolean) => `flex items-center gap-1.5 rounded-md px-3 py-1 text-sm transition ${active ? "bg-surface font-medium text-fg shadow-sm" : "text-fg-soft hover:text-fg"}`;
  const badge = (n: number) => (n > 0 ? <span className="rounded-full bg-accent px-1.5 text-xs font-semibold leading-5 text-on-accent-strong">{n}</span> : null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 px-4">
        <h1 className="font-serif text-2xl text-fg">Feedback</h1>
        <Link href="/redaktion/tickets/new" className="flex items-center gap-1.5 rounded-full bg-accent-strong px-3.5 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90">
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Neu
        </Link>
      </div>

      {admin && (
        <div role="tablist" aria-label="Postfach" className="mx-4 flex w-fit gap-0.5 rounded-lg bg-surface-2 p-0.5">
          <button type="button" role="tab" aria-selected={box === "inbox"} onClick={() => setBox("inbox")} className={seg(box === "inbox")}>
            Eingang {badge(counts.inbox)}
          </button>
          <button type="button" role="tab" aria-selected={box === "mine"} onClick={() => setBox("mine")} className={seg(box === "mine")}>
            Meine {badge(counts.mine)}
          </button>
        </div>
      )}
      {!admin && counts.mine > 0 && <p className="sr-only">{counts.mine} ungelesen</p>}

      {inBox.length > 0 && (
        <label className="relative mx-4 block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={2} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suchen"
            aria-label="Tickets durchsuchen"
            className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-sm text-fg outline-none placeholder:text-muted focus:border-accent"
          />
        </label>
      )}

      {inBox.length === 0 ? (
        <div className="mx-4 flex flex-col items-center gap-3 rounded-xl border border-dashed border-line px-4 py-10 text-center">
          <Inbox className="h-8 w-8 text-muted" strokeWidth={1.5} />
          <p className="text-sm text-fg-soft">{admin && box === "inbox" ? "Der Eingang ist leer." : "Noch kein Ticket."}</p>
          {!(admin && box === "inbox") && (
            <Link href="/redaktion/tickets/new" className="text-sm font-medium text-accent hover:underline">
              Fehler, Wunsch oder Frage melden
            </Link>
          )}
        </div>
      ) : groups.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted">Nichts gefunden.</p>
      ) : (
        <div className="flex flex-col">
          {groups.map((g) => {
            const collapsible = g.key === "closed" && !searching;
            const expanded = !collapsible || closedOpen;
            return (
              <section key={g.key} aria-label={g.label}>
                {collapsible ? (
                  <button type="button" aria-expanded={expanded} onClick={() => setClosedOpen((v) => !v)} className="flex w-full items-center gap-1.5 px-4 pb-1 pt-3 text-left text-xs font-medium text-fg-soft transition hover:text-fg">
                    <ChevronDown className={`h-3.5 w-3.5 transition ${expanded ? "" : "-rotate-90"}`} strokeWidth={2} />
                    {g.label}
                    <span className="font-normal text-muted">{g.items.length}</span>
                  </button>
                ) : (
                  <h2 className="px-4 pb-1 pt-3 text-xs font-medium text-fg-soft">
                    {g.label} <span className="font-normal text-muted">{g.items.length}</span>
                  </h2>
                )}
                {expanded && (
                  <ul className="flex flex-col">
                    {g.items.map((t) => {
                      const unread = isUnread(t, userId, t.read_at) && t.id !== openId;
                      const active = t.id === openId;
                      const meta = [ticketNumber(t.number), KIND_LABEL[t.kind], t.category ? CATEGORY_LABEL[t.category] : null, box === "inbox" && admin ? t.by : null, t.status === "declined" ? STATUS_LABEL.declined : null].filter(Boolean);
                      return (
                        <li key={t.id}>
                          <Link
                            href={`/redaktion/tickets/${t.id}`}
                            aria-current={active ? "page" : undefined}
                            className={`grid grid-cols-[0.5rem_minmax(0,1fr)_auto] items-start gap-x-3 border-t border-line px-4 py-2.5 transition ${active ? "bg-surface-2 shadow-[inset_2px_0_0_var(--accent)]" : "hover:bg-surface-2/60"}`}
                          >
                            <span className="mt-1.5">
                              <StatusDot status={t.status} />
                            </span>
                            <span className="min-w-0">
                              <span className="flex items-center gap-1.5">
                                {t.urgent && <Flag aria-label="Dringend" className="h-3.5 w-3.5 shrink-0 fill-red-500/20 text-red-600 dark:text-red-400" strokeWidth={2} />}
                                <span className={`truncate text-[15px] ${unread ? "font-semibold text-fg" : t.status === "done" || t.status === "declined" ? "text-fg-soft" : "text-fg"}`}>{t.title}</span>
                              </span>
                              <span className="block truncate text-xs text-muted">{meta.join(" · ")}</span>
                            </span>
                            <span className={`flex items-center gap-1.5 pt-0.5 text-xs tabular-nums ${unread ? "font-medium text-accent" : "text-muted"}`}>
                              {unread && <span aria-label="Ungelesen" className="h-1.5 w-1.5 rounded-full bg-accent" />}
                              {shortWhen(t.updated_at)}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
