"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Copy } from "lucide-react";
import { alertDialog } from "@/components/confirm-dialog";
import { TicketKindChip, TicketStatusChip, ticketDate } from "@/components/ticket-chips";
import { KINDS, STATUSES, ticketAsTask, type TicketKind, type TicketRow, type TicketStatus } from "@/lib/tickets";
import { setTicketStatus } from "./actions";

export type InboxTicket = TicketRow & { by: string };

const btn = "rounded-full border border-line px-3 py-1 text-sm font-medium text-fg-soft transition hover:border-accent hover:text-accent disabled:opacity-50";

function CopyTask({ ticket }: { ticket: InboxTicket }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(ticketAsTask(ticket)).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        });
      }}
      className={`${btn} flex items-center gap-1.5`}
    >
      {done ? <Check className="h-3.5 w-3.5" strokeWidth={2} /> : <Copy className="h-3.5 w-3.5" strokeWidth={2} />}
      Als Aufgabe kopieren
    </button>
  );
}

// Eingang der Betreiberin: filtern nach Stand und Art, Status setzen, als Aufgabe kopieren
export function Inbox({ tickets }: { tickets: InboxTicket[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"all" | TicketStatus>("open");
  const [kind, setKind] = useState<"all" | TicketKind>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const m = new Map<string, number>([["all", tickets.length]]);
    for (const t of tickets) m.set(t.status, (m.get(t.status) ?? 0) + 1);
    return m;
  }, [tickets]);
  const visible = tickets.filter((t) => (status === "all" || t.status === status) && (kind === "all" || t.kind === kind));

  function setTo(id: string, next: TicketStatus) {
    startTransition(async () => {
      const error = await setTicketStatus(id, next);
      if (error) void alertDialog(error);
      else router.refresh();
    });
  }

  const chip = (active: boolean) => `rounded-full border px-3 py-1 text-sm transition ${active ? "border-accent bg-accent/10 font-medium text-accent" : "border-line text-fg-soft hover:border-accent hover:text-accent"}`;

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Stand" className="flex flex-wrap gap-1.5">
        {[{ key: "all" as const, label: "Alle" }, ...STATUSES].map((s) => (
          <button key={s.key} type="button" role="tab" aria-selected={status === s.key} onClick={() => setStatus(s.key)} className={chip(status === s.key)}>
            {s.label} <span className="text-xs opacity-70">{counts.get(s.key) ?? 0}</span>
          </button>
        ))}
      </div>
      <div role="tablist" aria-label="Art" className="flex flex-wrap gap-1.5">
        {[{ key: "all" as const, label: "Alle Arten" }, ...KINDS].map((k) => (
          <button key={k.key} type="button" role="tab" aria-selected={kind === k.key} onClick={() => setKind(k.key)} className={chip(kind === k.key)}>
            {k.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted">Keine Meldungen.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((t) => {
            const open = openId === t.id;
            return (
              <li key={t.id} className="rounded-2xl border border-line bg-surface">
                <button type="button" onClick={() => setOpenId(open ? null : t.id)} aria-expanded={open} className="flex w-full items-start gap-3 p-3 text-left">
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <TicketStatusChip status={t.status} />
                      <TicketKindChip kind={t.kind} />
                      <span className="text-xs text-muted">
                        {t.by} · {ticketDate(t.created_at)}
                      </span>
                    </span>
                    <span className="break-words font-medium text-fg">{t.title}</span>
                  </span>
                  <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={2} />
                </button>
                {open && (
                  <div className="flex flex-col gap-3 border-t border-line px-3 py-3 text-sm">
                    {t.body && <p className="whitespace-pre-wrap break-words text-fg">{t.body}</p>}
                    {(t.page_path || t.device) && (
                      <dl className="flex flex-col gap-1 text-xs text-muted">
                        {t.page_path && (
                          <div className="flex gap-2">
                            <dt className="shrink-0">Seite</dt>
                            <dd className="min-w-0 break-all text-fg-soft">{t.page_path}</dd>
                          </div>
                        )}
                        {t.device && (
                          <div className="flex gap-2">
                            <dt className="shrink-0">Gerät</dt>
                            <dd className="min-w-0 break-words text-fg-soft">{t.device}</dd>
                          </div>
                        )}
                      </dl>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {STATUSES.filter((s) => s.key !== t.status).map((s) => (
                        <button key={s.key} type="button" disabled={pending} onClick={() => setTo(t.id, s.key)} className={btn}>
                          {s.label}
                        </button>
                      ))}
                      <CopyTask ticket={t} />
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
