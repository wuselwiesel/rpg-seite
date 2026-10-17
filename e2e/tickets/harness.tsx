// Testseite für das Ticket-Postfach: neues Ticket, Liste und Verlauf. Server-Aktionen, Upload und Live-Kanal sind Platzhalter.
import { createRoot } from "react-dom/client";
import { ReportForm } from "@/app/redaktion/tickets/new/report-form";
import { TicketListView, type ListTicket } from "@/app/redaktion/tickets/ticket-list-view";
import { Thread } from "@/app/redaktion/tickets/[id]/thread";
import type { TicketComment, TicketRow } from "@/lib/tickets";

const params = new URLSearchParams(location.search);
const mode = params.get("mode");
const admin = params.has("admin");
const ME = "me";
const T1 = "00000000-0000-4000-8000-000000000001";
(window as unknown as { __path?: string }).__path = params.get("path") ?? "/redaktion/tickets";

const list: ListTicket[] = [
  { id: T1, number: 12, kind: "bug", title: "Bild und Text verschmelzen", status: "open", mine: true, last_actor: "admin", updated_at: "2026-10-17T10:00:00Z", read_at: null, by: "Mira" },
  { id: "00000000-0000-4000-8000-000000000002", number: 11, kind: "wish", title: "Dunkler Modus für den Editor", status: "working", mine: true, last_actor: ME, updated_at: "2026-10-16T09:00:00Z", read_at: null, by: "Mira" },
  { id: "00000000-0000-4000-8000-000000000003", number: 10, kind: "question", title: "Wie lösche ich ein Konto?", status: "done", mine: false, last_actor: "other", updated_at: "2026-10-15T09:00:00Z", read_at: "2026-10-15T10:00:00Z", by: "@sani" },
  { id: "00000000-0000-4000-8000-000000000004", number: 9, kind: "bug", title: "Chat scrollt nicht", status: "open", mine: false, last_actor: "other", updated_at: "2026-10-14T09:00:00Z", read_at: null, by: "@nadine" },
];

const ticket: TicketRow = {
  id: T1, number: 12, last_actor: "admin", images: ["u/0.png"], created_by: admin ? "mira" : ME, kind: "bug", title: "Bild und Text verschmelzen", body: "Zwei Figuren in einer Nachricht",
  status: "open", page_path: "/story/1", device: "Handy · 375×700", created_at: "2026-10-17T09:00:00Z", updated_at: "2026-10-17T10:00:00Z", closed_at: null,
};
const comments: TicketComment[] = [
  { id: "c1", ticket_id: T1, author_id: "admin", body: "Danke, ich schaue es mir an.", images: [], internal: false, created_at: "2026-10-17T09:30:00Z" },
  ...(admin ? [{ id: "c2", ticket_id: T1, author_id: "admin", body: "Erst Teil 2 fertig machen", images: [], internal: true, created_at: "2026-10-17T09:40:00Z" }] : []),
];

createRoot(document.getElementById("root")!).render(
  <div style={{ maxWidth: mode === "thread" ? 720 : 400, padding: mode === "thread" ? 0 : 16 }}>
    {mode === "list" ? (
      <TicketListView tickets={list} userId={ME} admin={admin} />
    ) : mode === "thread" ? (
      <Thread ticket={ticket} comments={comments} names={{ mira: "Mira", admin: "Betreiberin", [ME]: "Ich" }} userId={admin ? "admin" : ME} admin={admin} />
    ) : (
      <ReportForm />
    )}
  </div>,
);
