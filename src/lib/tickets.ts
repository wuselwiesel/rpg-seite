// Meldungen (Tickets): Arten, Stände und die Textform, die man als Aufgabe weitergeben kann. Ohne Server-Importe, auch für Client-Komponenten.
export type TicketKind = "bug" | "wish" | "question";
export type TicketStatus = "open" | "working" | "done" | "declined";

export type TicketRow = {
  id: string;
  created_by: string;
  kind: TicketKind;
  title: string;
  body: string;
  status: TicketStatus;
  page_path: string | null;
  device: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
};

export const KINDS: { key: TicketKind; label: string }[] = [
  { key: "bug", label: "Fehler" },
  { key: "wish", label: "Wunsch" },
  { key: "question", label: "Frage" },
];

export const STATUSES: { key: TicketStatus; label: string }[] = [
  { key: "open", label: "Offen" },
  { key: "working", label: "In Arbeit" },
  { key: "done", label: "Erledigt" },
  { key: "declined", label: "Abgelehnt" },
];

export const KIND_LABEL: Record<TicketKind, string> = { bug: "Fehler", wish: "Wunsch", question: "Frage" };
export const STATUS_LABEL: Record<TicketStatus, string> = { open: "Offen", working: "In Arbeit", done: "Erledigt", declined: "Abgelehnt" };

export const isKind = (v: unknown): v is TicketKind => v === "bug" || v === "wish" || v === "question";
export const isStatus = (v: unknown): v is TicketStatus => v === "open" || v === "working" || v === "done" || v === "declined";

// Gerät in einer Zeile: Browser-Kennung, Fenstergröße, Touch oder Maus, hell oder dunkel
export function deviceSummary(info: { userAgent: string; width: number; height: number; touch: boolean; dark: boolean }): string {
  const ua = info.userAgent.replace(/\s+/g, " ").trim();
  const parts = [ua, `${Math.round(info.width)}×${Math.round(info.height)}`, info.touch ? "Touch" : "Maus", info.dark ? "dunkel" : "hell"];
  return parts.join(" · ").slice(0, 400);
}

// Seite aus dem Verweis: nur Pfade der eigenen Seite, nie die Meldeseite selbst
export function pathFromReferrer(referrer: string, origin: string): string {
  if (!referrer || !referrer.startsWith(origin)) return "";
  const path = referrer.slice(origin.length) || "/";
  return path.startsWith("/profile/meldungen") ? "" : path.slice(0, 300);
}

// Fertiger Text zum Einfügen als Aufgabe
export function ticketAsTask(t: Pick<TicketRow, "kind" | "title" | "body" | "page_path" | "device"> & { by?: string }): string {
  const lines = [`${KIND_LABEL[t.kind]}: ${t.title}`];
  if (t.body.trim()) lines.push("", t.body.trim());
  const meta = [t.by ? `Von: ${t.by}` : "", t.page_path ? `Seite: ${t.page_path}` : "", t.device ? `Gerät: ${t.device}` : ""].filter(Boolean);
  if (meta.length) lines.push("", ...meta);
  return lines.join("\n");
}

// Text der Benachrichtigung an die Melder:in
export function statusMessage(status: TicketStatus, title: string): string {
  const what = { open: "hat deine Meldung wieder geöffnet", working: "bearbeitet deine Meldung", done: "hat deine Meldung erledigt", declined: "hat deine Meldung abgelehnt" }[status];
  return `${what}: ${title}`;
}
