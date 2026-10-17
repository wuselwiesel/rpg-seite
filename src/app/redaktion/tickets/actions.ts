"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";
import { isCategory, isKind, isStatus, statusMessage, ticketNumber } from "@/lib/tickets";

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function actor(supabase: Supabase) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("username, nickname, avatar_url").eq("id", user.id).maybeSingle<{ username: string; nickname: string | null; avatar_url: string | null }>();
  return { id: user.id, name: data?.nickname || data?.username || "Jemand", avatarUrl: data?.avatar_url ?? null };
}

function refresh(id?: string) {
  revalidatePath("/redaktion/tickets", "layout");
  if (id) revalidatePath(`/redaktion/tickets/${id}`);
  revalidatePath("/", "layout");
}

// Neue Meldung; die Betreiberin bekommt eine Benachrichtigung (ein Fehler dabei verhindert die Meldung nicht). Gibt die Id der Meldung zurück.
export async function createTicket(input: { kind: string; title: string; body: string; page: string; device: string; images: string[]; category: string | null }): Promise<{ id?: string; error?: string }> {
  if (!isKind(input.kind)) return { error: "Wähle eine Art." };
  const title = input.title.trim().slice(0, 120);
  if (!title) return { error: "Der Titel fehlt." };
  const supabase = await createClient();
  const who = await actor(supabase);
  if (!who) return { error: "Nicht angemeldet." };
  const { data: id, error } = await supabase.rpc("create_ticket", {
    p_kind: input.kind,
    p_title: title,
    p_body: input.body.trim().slice(0, 4000),
    p_page: input.page.trim().slice(0, 300),
    p_device: input.device.slice(0, 400),
    p_images: input.images.slice(0, 4),
    p_category: isCategory(input.category) ? input.category : null,
  });
  if (error) return { error: error.message };
  try {
    const { data: row } = await supabase.from("tickets").select("number").eq("id", String(id)).maybeSingle<{ number: number }>();
    const { data } = await supabase.rpc("ticket_admin_recipients");
    const ids = (Array.isArray(data) ? data : []).filter((v): v is string => typeof v === "string");
    await Promise.all(
      ids.map((userId) =>
        createNotification(supabase, {
          userId,
          type: "ticket_new",
          actorName: who.name,
          actorAvatarUrl: who.avatarUrl,
          link: `/redaktion/tickets/${id}`,
          message: `hat ein Ticket geschrieben: ${row ? `${ticketNumber(row.number)} ` : ""}${title}`,
        }),
      ),
    );
  } catch {
    // Meldungen sind nachrangig.
  }
  refresh(String(id));
  return { id: String(id) };
}

// Antwort an einem Ticket; Gegenüber bekommt eine Benachrichtigung (interne Notizen nicht)
export async function addTicketComment(ticketId: string, body: string, images: string[], internal: boolean): Promise<string | null> {
  const supabase = await createClient();
  const who = await actor(supabase);
  if (!who) return "Nicht angemeldet.";
  const { data, error } = await supabase.rpc("add_ticket_comment", { p_ticket: ticketId, p_body: body.trim().slice(0, 2000), p_images: images.slice(0, 4), p_internal: internal });
  if (error) return error.message;
  const r = data as { created_by: string; title: string; number: number; by_admin: boolean; internal: boolean };
  try {
    if (!r.internal) {
      const label = `${ticketNumber(r.number)} ${r.title}`;
      if (r.by_admin && r.created_by !== who.id) {
        await createNotification(supabase, { userId: r.created_by, type: "ticket_comment", actorName: who.name, actorAvatarUrl: who.avatarUrl, link: `/redaktion/tickets/${ticketId}`, message: `hat auf dein Ticket geantwortet: ${label}` });
      } else if (!r.by_admin) {
        const { data: ids } = await supabase.rpc("ticket_admin_recipients");
        await Promise.all(
          (Array.isArray(ids) ? ids : [])
            .filter((v): v is string => typeof v === "string")
            .map((userId) => createNotification(supabase, { userId, type: "ticket_comment", actorName: who.name, actorAvatarUrl: who.avatarUrl, link: `/redaktion/tickets/${ticketId}`, message: `hat auf ein Ticket geantwortet: ${label}` })),
        );
      }
    }
  } catch {
    // Meldungen sind nachrangig.
  }
  refresh(ticketId);
  return null;
}

// Status setzen (nur die Betreiberin; die Datenbank prüft das); die Melder:in bekommt eine Benachrichtigung
export async function setTicketStatus(id: string, status: string): Promise<string | null> {
  if (!isStatus(status)) return "Unbekannter Status.";
  const supabase = await createClient();
  const who = await actor(supabase);
  if (!who) return "Nicht angemeldet.";
  const { data, error } = await supabase.rpc("set_ticket_status", { p_id: id, p_status: status });
  if (error) return error.message;
  const r = data as { created_by: string; title: string; number: number };
  if (r.created_by !== who.id) {
    await createNotification(supabase, {
      userId: r.created_by,
      type: "ticket_status",
      actorName: who.name,
      actorAvatarUrl: who.avatarUrl,
      link: `/redaktion/tickets/${id}`,
      message: statusMessage(status, r.title, r.number),
    });
  }
  refresh(id);
  return null;
}

// Ticket als gelesen markieren (für den Zähler und die fette Schrift in der Liste)
export async function markTicketRead(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("mark_ticket_read", { p_ticket: id });
}

// Einordnen (nur die Betreiberin; die Datenbank prüft das): dringend und Kategorie
export async function setTicketTriage(id: string, urgent: boolean, category: string | null): Promise<string | null> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_ticket_triage", { p_id: id, p_urgent: urgent, p_category: isCategory(category) ? category : null });
  if (error) return error.message;
  refresh(id);
  return null;
}

// Doppeltes Ticket einem anderen zuordnen (nur die Betreiberin); die Melder:in bekommt eine Benachrichtigung
export async function mergeTicket(id: string, intoNumber: number): Promise<string | null> {
  if (!Number.isInteger(intoNumber) || intoNumber < 1) return "Gib die Nummer des Haupttickets ein.";
  const supabase = await createClient();
  const who = await actor(supabase);
  if (!who) return "Nicht angemeldet.";
  const { data, error } = await supabase.rpc("merge_ticket", { p_id: id, p_into_number: intoNumber });
  if (error) return error.message;
  const r = data as { created_by: string; title: string; number: number; into_number: number };
  if (r.created_by !== who.id) {
    await createNotification(supabase, {
      userId: r.created_by,
      type: "ticket_status",
      actorName: who.name,
      actorAvatarUrl: who.avatarUrl,
      link: `/redaktion/tickets/${id}`,
      message: `hat deine Meldung mit einer gleichen zusammengeführt: ${ticketNumber(r.number)} ${r.title}`,
    });
  }
  refresh(id);
  return null;
}
