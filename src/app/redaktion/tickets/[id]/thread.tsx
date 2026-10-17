"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ChevronLeft, Flag, GitMerge, Link2, ListTodo, Lock, MoreHorizontal, Send } from "lucide-react";
import { alertDialog } from "@/components/confirm-dialog";
import { ImagePicker, TicketImages } from "@/components/ticket-images";
import { StatusDot, ticketTime } from "@/components/ticket-chips";
import { createClient } from "@/lib/supabase/client";
import {
  CATEGORIES,
  KIND_LABEL,
  STATUSES,
  STATUS_LABEL,
  deviceShort,
  isCategory,
  ticketAsTask,
  ticketNumber,
  type TicketCategory,
  type TicketComment,
  type TicketRow,
  type TicketStatus,
} from "@/lib/tickets";
import { uploadTicketImages } from "@/lib/ticket-upload";
import { addTicketComment, markTicketRead, mergeTicket, setTicketStatus, setTicketTriage } from "../actions";

const field = "rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-fg outline-none focus:border-accent";

function Avatar({ name, staff }: { name: string; staff: boolean }) {
  const initial = (name.replace(/^@/, "").trim()[0] ?? "?").toUpperCase();
  return (
    <span aria-hidden className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium ${staff ? "bg-accent/15 text-accent" : "bg-surface-3 text-fg-soft"}`}>
      {initial}
    </span>
  );
}

// „…“-Menü im Kopf: Link kopieren, für die Betreiberin Aufgabe kopieren und Zusammenführen
function MoreMenu({ link, task, onMerge }: { link: string; task: string | null; onMerge: (() => void) | null }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<"link" | "task" | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function copy(kind: "link" | "task", text: string) {
    void navigator.clipboard?.writeText(text).then(() => {
      setDone(kind);
      setTimeout(() => {
        setDone(null);
        setOpen(false);
      }, 900);
    });
  }

  const item = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-fg-soft transition hover:bg-surface-2 hover:text-fg";
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Mehr"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full text-fg-soft transition hover:bg-surface-2 hover:text-fg"
      >
        <MoreHorizontal className="h-5 w-5" strokeWidth={2} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-20 mt-1 w-56 rounded-xl border border-line bg-surface p-1.5 shadow-lg">
          {task && (
            <button type="button" role="menuitem" onClick={() => copy("task", task)} className={item}>
              {done === "task" ? <Check className="h-4 w-4" strokeWidth={2} /> : <ListTodo className="h-4 w-4" strokeWidth={2} />}
              {done === "task" ? "Kopiert" : "Aufgabe kopieren"}
            </button>
          )}
          <button type="button" role="menuitem" onClick={() => copy("link", link)} className={item}>
            {done === "link" ? <Check className="h-4 w-4" strokeWidth={2} /> : <Link2 className="h-4 w-4" strokeWidth={2} />}
            {done === "link" ? "Kopiert" : "Link kopieren"}
          </button>
          {onMerge && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onMerge();
              }}
              className={item}
            >
              <GitMerge className="h-4 w-4" strokeWidth={2} />
              Zusammenführen
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Ticket als Verlauf: Kopf mit Stand, Beschreibung und Antworten als Zeitleiste, Antwortfeld unten; Statuswechsel und neue Antworten erscheinen live
export function Thread({ ticket, comments: initial, names: initialNames, userId, admin }: { ticket: TicketRow; comments: TicketComment[]; names: Record<string, string>; userId: string; admin: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [urgent, setUrgent] = useState(ticket.urgent);
  const [category, setCategory] = useState<TicketCategory | null>(ticket.category);
  const [comments, setComments] = useState(initial);
  const [names, setNames] = useState(initialNames);
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [internal, setInternal] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeNo, setMergeNo] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  // Neue Daten vom Server (nach einer Aktion) mit dem lokalen Stand zusammenführen
  const [seen, setSeen] = useState({ ticket, initial });
  if (seen.ticket !== ticket || seen.initial !== initial) {
    setSeen({ ticket, initial });
    setStatus(ticket.status);
    setUrgent(ticket.urgent);
    setCategory(ticket.category);
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

  // Live: neue Antworten, Statuswechsel und Einordnung
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
        const row = payload.new as { status: TicketStatus; urgent?: boolean; category?: TicketCategory | null };
        setStatus(row.status);
        if (typeof row.urgent === "boolean") setUrgent(row.urgent);
        if (row.category !== undefined) setCategory(isCategory(row.category) ? row.category : null);
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
    if (next === status) return;
    startTransition(async () => {
      const error = await setTicketStatus(ticket.id, next);
      if (error) void alertDialog(error);
      else {
        setStatus(next);
        router.refresh();
      }
    });
  }

  function triage(nextUrgent: boolean, nextCategory: TicketCategory | null) {
    const before = { urgent, category };
    setUrgent(nextUrgent);
    setCategory(nextCategory);
    startTransition(async () => {
      const error = await setTicketTriage(ticket.id, nextUrgent, nextCategory);
      if (error) {
        setUrgent(before.urgent);
        setCategory(before.category);
        void alertDialog(error);
      } else router.refresh();
    });
  }

  function merge() {
    const no = Number(mergeNo.replace(/^#/, "").trim());
    startTransition(async () => {
      const error = await mergeTicket(ticket.id, no);
      if (error) {
        void alertDialog(error);
        return;
      }
      setMergeOpen(false);
      setMergeNo("");
      router.refresh();
    });
  }

  const mine = ticket.created_by === userId;
  const reporter = mine ? "Du" : (names[ticket.created_by] ?? "…");
  const task = admin ? ticketAsTask({ ...ticket, by: names[ticket.created_by] }) : null;
  const device = deviceShort(ticket.device);
  const link = typeof window === "undefined" ? `/redaktion/tickets/${ticket.id}` : `${window.location.origin}/redaktion/tickets/${ticket.id}`;

  return (
    <div className="flex flex-col lg:h-dvh">
      <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        <header className="z-10 border-b border-line bg-app lg:sticky lg:top-0">
          <div className="mx-auto flex max-w-2xl flex-col gap-3 px-4 py-4 sm:pt-6">
            <Link href="/redaktion/tickets" className="inline-flex w-fit items-center gap-1 text-sm text-muted transition hover:text-fg lg:hidden">
              <ChevronLeft className="h-4 w-4" strokeWidth={2} />
              Tickets
            </Link>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted">
                  <span className="tabular-nums">{ticketNumber(ticket.number)}</span>
                  <span>·</span>
                  <span>{KIND_LABEL[ticket.kind]}</span>
                  {!admin && category && (
                    <>
                      <span>·</span>
                      <span>{CATEGORIES.find((c) => c.key === category)?.label}</span>
                    </>
                  )}
                  {urgent && admin && (
                    <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 font-medium text-red-600 dark:text-red-400">
                      <Flag className="h-3 w-3" strokeWidth={2.5} />
                      Dringend
                    </span>
                  )}
                </p>
                <h1 className="mt-0.5 break-words font-serif text-2xl leading-tight text-fg">{ticket.title}</h1>
              </div>
              <MoreMenu link={link} task={task} onMerge={admin ? () => setMergeOpen(true) : null} />
            </div>

            {admin ? (
              <div role="radiogroup" aria-label="Stand" className="flex w-full overflow-hidden rounded-lg border border-line bg-surface text-sm sm:w-fit">
                {STATUSES.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    role="radio"
                    aria-checked={status === s.key}
                    disabled={pending}
                    onClick={() => setTo(s.key)}
                    className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap border-r border-line px-3 py-1.5 transition last:border-r-0 sm:flex-none ${status === s.key ? "bg-accent/10 font-medium text-accent" : "text-fg-soft hover:bg-surface-2 hover:text-fg"}`}
                  >
                    {status === s.key && <StatusDot status={s.key} />}
                    {s.label}
                  </button>
                ))}
              </div>
            ) : (
              <p className="flex items-center gap-2 text-sm text-fg-soft">
                <StatusDot status={status} />
                {STATUS_LABEL[status]}
              </p>
            )}

            {admin && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
                <span>
                  Von <span className="font-medium text-fg-soft">{reporter}</span>
                </span>
                {ticket.page_path && (
                  <span className="min-w-0 max-w-full truncate" title={ticket.page_path}>
                    Seite <span className="font-medium text-fg-soft">{ticket.page_path}</span>
                  </span>
                )}
                {device && (
                  <span title={ticket.device ?? undefined}>
                    Gerät <span className="font-medium text-fg-soft">{device}</span>
                  </span>
                )}
                <label className="flex items-center gap-1.5">
                  Kategorie
                  <select
                    value={category ?? ""}
                    disabled={pending}
                    onChange={(e) => triage(urgent, isCategory(e.target.value) ? e.target.value : null)}
                    className="rounded-lg border border-line bg-surface px-2 py-1 text-xs text-fg outline-none focus:border-accent"
                  >
                    <option value="">Keine</option>
                    {CATEGORIES.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  aria-pressed={urgent}
                  disabled={pending}
                  onClick={() => triage(!urgent, category)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${urgent ? "border-red-500/40 bg-red-500/10 font-medium text-red-600 dark:text-red-400" : "border-line text-fg-soft hover:border-red-500/40 hover:text-red-600"}`}
                >
                  <Flag className="h-3.5 w-3.5" strokeWidth={2} />
                  Dringend
                </button>
              </div>
            )}

            {mergeOpen && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  merge();
                }}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-3 text-sm"
              >
                <label className="flex items-center gap-2 text-fg-soft">
                  Zusammenführen mit
                  <input value={mergeNo} onChange={(e) => setMergeNo(e.target.value)} inputMode="numeric" placeholder="#12" aria-label="Nummer des Haupttickets" autoFocus className={`${field} w-24`} />
                </label>
                <button type="submit" disabled={pending || !mergeNo.trim()} className="rounded-full bg-accent-strong px-3.5 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50">
                  Zusammenführen
                </button>
                <button type="button" onClick={() => setMergeOpen(false)} className="text-sm text-muted transition hover:text-fg">
                  Abbrechen
                </button>
              </form>
            )}
          </div>
        </header>

        <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-6">
          <article className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3">
            <Avatar name={reporter === "Du" ? (names[ticket.created_by] ?? "Du") : reporter} staff={false} />
            <div className="flex min-w-0 flex-col gap-2">
              <p className="text-sm">
                <span className="font-medium text-fg">{reporter}</span> <span className="text-xs text-muted">· {ticketTime(ticket.created_at)}</span>
              </p>
              {ticket.body ? <p className="whitespace-pre-wrap break-words text-sm text-fg">{ticket.body}</p> : <p className="text-sm text-muted">Keine Beschreibung.</p>}
              <TicketImages paths={ticket.images} />
            </div>
          </article>

          {comments.length > 0 && (
            <ol aria-label="Verlauf" className="flex flex-col gap-5">
              {comments.map((c) => {
                if (c.system) {
                  return (
                    <li key={c.id} className="flex items-center gap-2 pl-10 text-xs text-muted">
                      <ArrowRight className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                      {c.system === "status" ? (
                        <span>
                          Status auf <span className="font-medium text-fg-soft">{c.body}</span> gesetzt · {ticketTime(c.created_at)}
                        </span>
                      ) : (
                        <span>
                          Zusammengeführt mit{" "}
                          {admin && ticket.merged_into ? (
                            <Link href={`/redaktion/tickets/${ticket.merged_into}`} className="font-medium text-accent hover:underline">
                              {c.body}
                            </Link>
                          ) : (
                            <span className="font-medium text-fg-soft">{c.body}</span>
                          )}{" "}
                          · {ticketTime(c.created_at)}
                        </span>
                      )}
                    </li>
                  );
                }
                const own = c.author_id === userId;
                const name = own ? "Du" : (names[c.author_id] ?? "…");
                return (
                  <li key={c.id} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3">
                    <Avatar name={own ? (names[c.author_id] ?? "Du") : name} staff={c.author_id !== ticket.created_by} />
                    <div className={`flex min-w-0 flex-col gap-2 ${c.internal ? "rounded-xl border border-dashed border-amber-500/50 bg-amber-500/10 px-3 py-2.5" : ""}`}>
                      <p className="flex flex-wrap items-center gap-x-2 text-sm">
                        <span className="font-medium text-fg">{name}</span>
                        {c.internal && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                            <Lock className="h-3 w-3" strokeWidth={2.5} />
                            Interne Notiz
                          </span>
                        )}
                        <span className="text-xs text-muted">· {ticketTime(c.created_at)}</span>
                      </p>
                      {c.body && <p className="whitespace-pre-wrap break-words text-sm text-fg">{c.body}</p>}
                      <TicketImages paths={c.images} />
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="border-t border-line bg-app lg:shrink-0"
      >
        <div className={`mx-auto flex max-w-2xl flex-col gap-2 px-4 py-3 ${internal ? "[&_textarea]:bg-amber-500/5" : ""}`}>
          <div className={`rounded-xl border bg-surface transition focus-within:border-accent ${internal ? "border-dashed border-amber-500/60" : "border-line"}`}>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={2000}
              rows={2}
              placeholder={internal ? "Interne Notiz (nur für dich)" : "Antworten"}
              aria-label="Antwort"
              className="block w-full resize-none rounded-xl bg-transparent px-3 pt-2.5 text-sm text-fg outline-none placeholder:text-muted"
            />
            <div className="flex flex-wrap items-center gap-2 px-2 pb-2 pt-1">
              <ImagePicker files={files} onChange={setFiles} compact />
              <span className="flex-1" />
              {admin && (
                <button
                  type="button"
                  aria-pressed={internal}
                  onClick={() => setInternal((v) => !v)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition ${internal ? "bg-amber-500/15 font-medium text-amber-700 dark:text-amber-400" : "text-fg-soft hover:bg-surface-2 hover:text-fg"}`}
                >
                  <Lock className="h-3.5 w-3.5" strokeWidth={2} />
                  Interne Notiz
                </button>
              )}
              <button
                type="submit"
                disabled={pending || (!body.trim() && files.length === 0)}
                className="flex items-center gap-1.5 rounded-full bg-accent-strong px-4 py-1.5 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" strokeWidth={2} />
                Senden
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
