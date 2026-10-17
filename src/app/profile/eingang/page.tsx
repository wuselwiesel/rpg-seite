import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAppAdmin } from "@/lib/account-marks";
import type { TicketRow } from "@/lib/tickets";
import { Inbox, type InboxTicket } from "./inbox";

export const metadata = { title: "Meldungs-Eingang" };

// Alle Meldungen der Mitglieder (nur Betreiberin)
export default async function InboxPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await isAppAdmin())) notFound();

  const { data } = await supabase
    .from("tickets")
    .select("id, created_by, kind, title, body, status, page_path, device, created_at, updated_at, closed_at, profiles!tickets_created_by_fkey(username, nickname)")
    .order("created_at", { ascending: false })
    .limit(300)
    .returns<(TicketRow & { profiles: { username: string; nickname: string | null } | null })[]>();
  const tickets: InboxTicket[] = (data ?? []).map(({ profiles, ...t }) => ({ ...t, by: profiles?.nickname || (profiles?.username ? `@${profiles.username}` : "Unbekannt") }));

  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-serif text-2xl text-fg">Meldungs-Eingang</h2>
      <Inbox tickets={tickets} />
    </div>
  );
}
