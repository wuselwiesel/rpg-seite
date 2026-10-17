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
