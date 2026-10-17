// Testseite für Meldungen: Meldeformular und Eingang der Betreiberin. Server-Aktionen sind Platzhalter, die ihre Aufrufe merken.
import { createRoot } from "react-dom/client";
import { ReportForm } from "@/app/profile/meldungen/report-form";
import { Inbox, type InboxTicket } from "@/app/profile/eingang/inbox";

const base = { created_by: "u", body: "", page_path: null, device: null, updated_at: "2026-10-17T10:00:00Z", closed_at: null };
const tickets: InboxTicket[] = [
  { ...base, id: "t1", kind: "bug", title: "Bild und Text verschmelzen", body: "Zwei Figuren in einer Nachricht", status: "open", page_path: "/story/1", device: "Handy · 375×700", created_at: "2026-10-17T09:00:00Z", by: "Mira" },
  { ...base, id: "t2", kind: "wish", title: "Dunkler Modus für den Editor", status: "working", created_at: "2026-10-16T09:00:00Z", by: "@sani" },
  { ...base, id: "t3", kind: "question", title: "Wie lösche ich ein Konto?", status: "done", created_at: "2026-10-15T09:00:00Z", by: "Mira" },
];

const mode = new URLSearchParams(location.search).get("mode");
createRoot(document.getElementById("root")!).render(
  <div style={{ maxWidth: 448, padding: 16 }}>{mode === "inbox" ? <Inbox tickets={tickets} /> : <ReportForm />}</div>,
);
