"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, Copy } from "lucide-react";
import { alertDialog } from "@/components/confirm-dialog";
import { ImagePicker, TicketImages } from "@/components/ticket-images";
import { TicketKindChip, TicketStatusChip, ticketTime } from "@/components/ticket-chips";
import { createClient } from "@/lib/supabase/client";
import { STATUSES, ticketAsTask, ticketNumber, type TicketComment, type TicketRow, type TicketStatus } from "@/lib/tickets";
import { uploadTicketImages } from "@/lib/ticket-upload";
import { addTicketComment, markTicketRead, setTicketStatus } from "../actions";

const input = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent";
const btn = "rounded-full border border-line px-3 py-1 text-sm font-medium text-fg-soft transition hover:border-accent hover:text-accent disabled:opacity-50";

function CopyTask({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
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

// Ticket als Verlauf wie in einem Postfach: Beschreibung, Bilder, Antworten; Statuswechsel und neue Antworten erscheinen live
export function Thread({ ticket, comments: initial, names: initialNames, userId, admin }: { ticket: TicketRow; comments: TicketComment[]; names: Record<string, string>; userId: string; admin: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [comments, setComments] = useState(initial);
  const [names, setNames] = useState(initialNames);
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [internal, setInternal] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Neue Daten vom Server (nach einer Aktion) mit dem lokalen Stand zusammenführen
  const [seen, setSeen] = useState({ ticket, initial });
  if (seen.ticket !== ticket || seen.initial !== initial) {
    setSeen({ ticket, initial });
    setStatus(ticket.status);
    setComments((prev) => {
      const byId = new Map(prev.map((c) => [c.id, c]));
      for (const c of initial) byId.set(c.id, c);
      return [...byId.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
    });
    setNames((prev) => ({ ...prev, ...initialNames }));
  }

  // Gelesen markieren, sobald das Ticket offen ist, und die Liste daneben auffrischen
  const lastCount = useRef(-1);
  useEffect(() => {
    const total = comments.length;
    if (lastCount.current === total) return;
    lastCount.current = total;
    void markTicketRead(ticket.id).then(() => router.refresh());
    endRef.current?.scrollIntoView({ block: "end" });
  }, [comments.length, ticket.id, router]);

  // Live: neue Antworten und Statuswechsel
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`ticket-${ticket.id}-${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ticket_comments", filter: `ticket_id=eq.${ticket.id}` }, (payload) => {
        const row = payload.new as TicketComment;
        setComments((prev) => (prev.some((c) => c.id === row.id) ? prev : [...prev, row]));
        setNames((prev) => {
          if (prev[row.author_id]) return prev;
          void supabase
            .from("profiles")
            .select("username, nickname")
            .eq("id", row.author_id)
            .maybeSingle<{ username: string; nickname: string | null }>()
            .then(({ data }) => data && setNames((p) => ({ ...p, [row.author_id]: data.nickname || `@${data.username}` })));
          return prev;
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tickets", filter: `id=eq.${ticket.id}` }, (payload) => {
        setStatus((payload.new as { status: TicketStatus }).status);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticket.id]);

  function send() {
    startTransition(async () => {
      const up = await uploadTicketImages(files);
      if ("error" in up) {
        void alertDialog(up.error);
        return;
      }
      const error = await addTicketComment(ticket.id, body, up.paths, admin && internal);
      if (error) {
        void alertDialog(error);
        return;
      }
      setBody("");
      setFiles([]);
      setInternal(false);
      router.refresh();
    });
  }

  function setTo(next: TicketStatus) {
    startTransition(async () => {
      const error = await setTicketStatus(ticket.id, next);
      if (error) void alertDialog(error);
      else {
        setStatus(next);
        router.refresh();
      }
    });
  }

  const mine = ticket.created_by === userId;
  const task = ticketAsTask({ ...ticket, by: names[ticket.created_by] });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-6 sm:py-10 lg:h-dvh lg:overflow-y-auto">
      <Link href="/redaktion/tickets" className="inline-flex w-fit items-center gap-1 text-sm text-muted transition hover:text-fg lg:hidden">
        <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        Tickets
      </Link>

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm tabular-nums text-muted">{ticketNumber(ticket.number)}</span>
          <TicketStatusChip status={status} />
          <TicketKindChip kind={ticket.kind} />
          <span className="text-xs text-muted">
            {mine ? "von dir" : names[ticket.created_by]} · {ticketTime(ticket.created_at)}
          </span>
        </div>
        <h1 className="break-words font-serif text-2xl text-fg">{ticket.title}</h1>
        {admin && (
          <div className="flex flex-wrap gap-2">
            {STATUSES.filter((s) => s.key !== status).map((s) => (
              <button key={s.key} type="button" disabled={pending} onClick={() => setTo(s.key)} className={btn}>
                {s.label}
              </button>
            ))}
            <CopyTask text={task} />
          </div>
        )}
      </header>

      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
        {ticket.body && <p className="whitespace-pre-wrap break-words text-sm text-fg">{ticket.body}</p>}
        <TicketImages paths={ticket.images} />
        {admin && (ticket.page_path || ticket.device) && (
          <dl className="flex flex-col gap-1 border-t border-line pt-3 text-xs text-muted">
            {ticket.page_path && (
              <div className="flex gap-2">
                <dt className="shrink-0">Seite</dt>
                <dd className="min-w-0 break-all text-fg-soft">{ticket.page_path}</dd>
              </div>
            )}
            {ticket.device && (
              <div className="flex gap-2">
                <dt className="shrink-0">Gerät</dt>
                <dd className="min-w-0 break-words text-fg-soft">{ticket.device}</dd>
              </div>
            )}
          </dl>
        )}
      </section>

      {comments.length > 0 && (
        <ul aria-label="Verlauf" className="flex flex-col gap-3">
          {comments.map((c) => {
            const own = c.author_id === userId;
            return (
              <li
                key={c.id}
                className={`flex flex-col gap-2 rounded-2xl p-3 text-sm ${c.internal ? "border border-dashed border-amber-500/50 bg-amber-500/10" : own ? "ml-8 bg-accent/10" : "mr-8 border border-line bg-surface"}`}
              >
                <p className="flex flex-wrap items-baseline gap-x-2 text-xs text-muted">
                  <span className="font-medium text-fg-soft">{own ? "Du" : (names[c.author_id] ?? "…")}</span>
                  {c.internal && <span className="rounded-full bg-amber-500/20 px-1.5 text-amber-700 dark:text-amber-400">Interne Notiz</span>}
                  <span>{ticketTime(c.created_at)}</span>
                </p>
                {c.body && <p className="whitespace-pre-wrap break-words text-fg">{c.body}</p>}
                <TicketImages paths={c.images} />
              </li>
            );
          })}
        </ul>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex flex-col gap-2"
      >
        <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} rows={3} placeholder="Antwort" aria-label="Antwort" className={input} />
        <ImagePicker files={files} onChange={setFiles} />
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending || (!body.trim() && files.length === 0)} className="rounded-full bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50">
            Senden
          </button>
          {admin && (
            <label className="flex items-center gap-2 text-sm text-fg-soft">
              <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
              Interne Notiz
            </label>
          )}
        </div>
      </form>
      <div ref={endRef} />
    </div>
  );
}
