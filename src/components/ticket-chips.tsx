import { KIND_LABEL, STATUS_LABEL, type TicketKind, type TicketStatus } from "@/lib/tickets";

const STATUS_STYLE: Record<TicketStatus, string> = {
  open: "bg-accent/15 text-accent",
  working: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  done: "bg-surface-3 text-fg-soft",
  declined: "bg-red-500/15 text-red-600 dark:text-red-400",
};

export function TicketStatusChip({ status }: { status: TicketStatus }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>;
}

export function TicketKindChip({ kind }: { kind: TicketKind }) {
  return <span className="rounded-full border border-line px-2 py-0.5 text-xs text-fg-soft">{KIND_LABEL[kind]}</span>;
}

export function ticketDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function ticketTime(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

const STATUS_DOT: Record<TicketStatus, string> = {
  open: "bg-accent",
  working: "bg-amber-500",
  done: "bg-emerald-500",
  declined: "bg-fg-soft/50",
};

// Stand als farbiger Punkt (die Liste nutzt ihn statt eines Chips)
export function StatusDot({ status, className = "" }: { status: TicketStatus; className?: string }) {
  return <span aria-hidden className={`inline-block h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[status]} ${className}`} />;
}
