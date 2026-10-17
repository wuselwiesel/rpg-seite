import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAppAdmin } from "@/lib/account-marks";
import type { TicketComment, TicketRow } from "@/lib/tickets";
import { Thread } from "./thread";

export const metadata = { title: "Ticket" };

// Ein Ticket mit Verlauf: Beschreibung, Bilder, Antworten (für die Betreiberin auch interne Notizen)
export default async function TicketPage({ params }: PageProps<"/redaktion/tickets/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const admin = await isAppAdmin();

  const { data: ticket } = await supabase
    .from("tickets")
    .select("id, number, last_actor, images, created_by, kind, title, body, status, page_path, device, created_at, updated_at, closed_at")
    .eq("id", id)
    .maybeSingle<TicketRow>();
  if (!ticket) notFound();

  const { data: comments } = await supabase
    .from("ticket_comments")
    .select("id, ticket_id, author_id, body, images, internal, created_at")
    .eq("ticket_id", id)
    .order("created_at")
    .returns<TicketComment[]>();

  const ids = [...new Set([ticket.created_by, ...(comments ?? []).map((c) => c.author_id)])];
  const { data: profiles } = await supabase.from("profiles").select("id, username, nickname").in("id", ids).returns<{ id: string; username: string; nickname: string | null }[]>();
  const names = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.nickname || `@${p.username}`]));

  return <Thread ticket={ticket} comments={comments ?? []} names={names} userId={user.id} admin={admin} />;
}
