import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { TicketRow } from "@/lib/tickets";
import { TicketKindChip, TicketStatusChip, ticketDate } from "@/components/ticket-chips";
import { ReportForm } from "./report-form";

export const metadata = { title: "Meldungen" };

// Etwas melden (Fehler, Wunsch, Frage) und die eigenen Meldungen mit Stand
export default async function ReportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("tickets")
    .select("id, created_by, kind, title, body, status, page_path, device, created_at, updated_at, closed_at")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<TicketRow[]>();
  const tickets = data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-serif text-2xl text-fg">Etwas melden</h2>
      <ReportForm />
      {tickets.length > 0 && (
        <section aria-label="Meine Meldungen" className="flex flex-col gap-2">
          <h3 className="font-serif text-xl text-fg">Meine Meldungen</h3>
          <ul className="flex flex-col gap-2">
            {tickets.map((t) => (
              <li key={t.id} className="flex flex-col gap-1.5 rounded-2xl border border-line bg-surface p-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <TicketStatusChip status={t.status} />
                  <TicketKindChip kind={t.kind} />
                  <span className="ml-auto text-xs text-muted">{ticketDate(t.created_at)}</span>
                </div>
                <p className="break-words font-medium text-fg">{t.title}</p>
                {t.body && <p className="line-clamp-3 whitespace-pre-wrap break-words text-sm text-fg-soft">{t.body}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
