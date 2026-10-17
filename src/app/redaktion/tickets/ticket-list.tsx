import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAppAdmin } from "@/lib/account-marks";
import type { TicketKind, TicketStatus } from "@/lib/tickets";
import { TicketListView, type ListTicket } from "./ticket-list-view";

type Row = { id: string; number: number; kind: TicketKind; title: string; status: TicketStatus; created_by: string; last_actor: string | null; updated_at: string; profiles: { username: string; nickname: string | null } | null };

// Postfach: links die Liste. Eigene Tickets unter „Erstellte Tickets“, für die Betreiberin zusätzlich alle anderen unter „Eingang“.
export async function TicketList() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const admin = await isAppAdmin();

  const [{ data: rows }, { data: reads }] = await Promise.all([
    supabase
      .from("tickets")
      .select("id, number, kind, title, status, created_by, last_actor, updated_at, profiles!tickets_created_by_fkey(username, nickname)")
      .order("updated_at", { ascending: false })
      .limit(300)
      .returns<Row[]>(),
    supabase.from("ticket_reads").select("ticket_id, read_at").eq("user_id", user.id).returns<{ ticket_id: string; read_at: string }[]>(),
  ]);
  const readAt = new Map((reads ?? []).map((r) => [r.ticket_id, r.read_at]));
  const tickets: ListTicket[] = (rows ?? []).map((t) => ({
    id: t.id,
    number: t.number,
    kind: t.kind,
    title: t.title,
    status: t.status,
    mine: t.created_by === user.id,
    last_actor: t.last_actor,
    updated_at: t.updated_at,
    read_at: readAt.get(t.id) ?? null,
    by: t.profiles?.nickname || (t.profiles?.username ? `@${t.profiles.username}` : "Unbekannt"),
  }));

  return <TicketListView tickets={tickets} userId={user.id} admin={admin} />;
}
