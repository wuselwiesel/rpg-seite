// Meldungen (Tickets): Arten, Stände und die Textform, die man als Aufgabe weitergeben kann. Ohne Server-Importe, auch für Client-Komponenten.
export type TicketKind = "bug" | "wish" | "question";
export type TicketStatus = "open" | "working" | "done" | "declined";
export type TicketCategory = "scene" | "wiki" | "chat" | "cast" | "character" | "feed" | "settings" | "other";

export type TicketRow = {
  id: string;
  number: number;
  last_actor: string | null;
  images: string[];
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
  urgent: boolean;
  category: TicketCategory | null;
  merged_into: string | null;
};

export type TicketComment = {
  id: string;
  ticket_id: string;
  author_id: string;
  body: string;
  images: string[];
  internal: boolean;
  // Zeile im Verlauf statt Nachricht: Statuswechsel („body“ = Name des Stands) oder Zusammenführen („body“ = Nummer)
  system: "status" | "merge" | null;
  created_at: string;
};

// Nummer wie in einem Postfach: #12
export const ticketNumber = (n: number) => `#${n}`;

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

export const CATEGORIES: { key: TicketCategory; label: string }[] = [
  { key: "scene", label: "Szene" },
  { key: "wiki", label: "Wiki" },
  { key: "chat", label: "Chat" },
  { key: "cast", label: "Besetzung" },
  { key: "character", label: "Charaktere" },
  { key: "feed", label: "Feed" },
  { key: "settings", label: "Einstellungen" },
  { key: "other", label: "Sonstiges" },
];
export const CATEGORY_LABEL: Record<TicketCategory, string> = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.label])) as Record<TicketCategory, string>;
export const isCategory = (v: unknown): v is TicketCategory => typeof v === "string" && v in CATEGORY_LABEL;

// Kategorie aus der gemeldeten Seite vorschlagen (leer, wenn nichts passt)
export function categoryFromPath(path: string): TicketCategory | null {
  const p = path.trim().split(/[?#]/)[0];
  if (!p) return null;
  if (p.startsWith("/wiki/besetzung")) return "cast";
  if (p.startsWith("/wiki")) return "wiki";
  if (p.startsWith("/story")) return "scene";
  if (p.startsWith("/chats") || p.startsWith("/redaktion/chat")) return "chat";
  if (p.startsWith("/characters") || /^\/worlds\/[^/]+\/charaktere/.test(p)) return "character";
  if (p.startsWith("/profile")) return "settings";
  if (p === "/" || p.startsWith("/redaktion") || p.startsWith("/feed")) return "feed";
  return null;
}

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

// Gerät kurz: System, Browser, Fenstergröße, Touch/Maus, hell/dunkel (aus der langen Zeile von `deviceSummary`)
export function deviceShort(device: string | null | undefined): string {
  if (!device) return "";
  const [ua = "", ...rest] = device.split(" · ");
  const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Macintosh|Mac OS/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /Firefox\/|FxiOS/.test(ua) ? "Firefox" : /Chrome\/|CriOS/.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "";
  return [os, browser, ...rest].filter(Boolean).join(", ");
}

// Fertiger Text zum Einfügen als Aufgabe
export function ticketAsTask(t: Pick<TicketRow, "kind" | "title" | "body" | "page_path" | "device"> & { number?: number; by?: string }): string {
  const lines = [`${t.number ? `${ticketNumber(t.number)} ` : ""}${KIND_LABEL[t.kind]}: ${t.title}`];
  if (t.body.trim()) lines.push("", t.body.trim());
  const meta = [t.by ? `Von: ${t.by}` : "", t.page_path ? `Seite: ${t.page_path}` : "", t.device ? `Gerät: ${t.device}` : ""].filter(Boolean);
  if (meta.length) lines.push("", ...meta);
  return lines.join("\n");
}

// Text der Benachrichtigung an die Melder:in
export function statusMessage(status: TicketStatus, title: string, number?: number): string {
  const what = { open: "hat deine Meldung wieder geöffnet", working: "bearbeitet deine Meldung", done: "hat deine Meldung erledigt", declined: "hat deine Meldung abgelehnt" }[status];
  return `${what}: ${number ? `${ticketNumber(number)} ` : ""}${title}`;
}

// Ungelesen: zuletzt hat jemand anderes etwas getan und ich habe das noch nicht geöffnet (gleiche Regel wie `ticket_unread_count` in der Datenbank)
export function isUnread(t: { last_actor: string | null; updated_at: string }, me: string, readAt: string | null | undefined): boolean {
  return t.last_actor !== me && (!readAt || readAt < t.updated_at);
}

// Gruppen der Liste: Offen, In Arbeit, Abgeschlossen (erledigt oder abgelehnt)
export type TicketGroupKey = "open" | "working" | "closed";
export const GROUPS: { key: TicketGroupKey; label: string }[] = [
  { key: "open", label: "Offen" },
  { key: "working", label: "In Arbeit" },
  { key: "closed", label: "Abgeschlossen" },
];
export const groupOf = (s: TicketStatus): TicketGroupKey => (s === "open" ? "open" : s === "working" ? "working" : "closed");

// Innerhalb einer Gruppe: Dringendes zuerst, dann das zuletzt Bewegte
export function sortTickets<T extends { urgent: boolean; updated_at: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => Number(b.urgent) - Number(a.urgent) || b.updated_at.localeCompare(a.updated_at));
}

// Suche über Nummer, Titel, Melder:in, Art und Kategorie
export function matchesQuery(t: { number: number; title: string; by: string; kind: TicketKind; category: TicketCategory | null }, query: string): boolean {
  const q = query.trim().toLowerCase().replace(/^#/, "");
  if (!q) return true;
  return [String(t.number), t.title, t.by, KIND_LABEL[t.kind], t.category ? CATEGORY_LABEL[t.category] : ""].some((v) => v.toLowerCase().includes(q));
}

// Kurze Zeit für die Liste: heute die Uhrzeit, gestern, in der Woche der Tag, sonst Tag und Monat
export function shortWhen(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 86400000);
  if (diff <= 0) return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  if (diff === 1) return "Gestern";
  if (diff < 7) return d.toLocaleDateString("de-DE", { weekday: "short" }).replace(".", "");
  return d.toLocaleDateString("de-DE", { day: "numeric", month: "short" });
}
