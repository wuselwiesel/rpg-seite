"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";
import { isStatus, statusMessage } from "@/lib/tickets";

// Status einer Meldung setzen (nur die Betreiberin; die Datenbank prüft das); die Melder:in bekommt eine Benachrichtigung
export async function setTicketStatus(id: string, status: string): Promise<string | null> {
  if (!isStatus(status)) return "Unbekannter Status.";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const { data, error } = await supabase.rpc("set_ticket_status", { p_id: id, p_status: status });
  if (error) return error.message;
  const r = data as { created_by: string; title: string };
  if (r.created_by !== user.id) {
    const { data: me } = await supabase.from("profiles").select("username, nickname, avatar_url").eq("id", user.id).maybeSingle<{ username: string; nickname: string | null; avatar_url: string | null }>();
    await createNotification(supabase, {
      userId: r.created_by,
      type: "ticket_status",
      actorName: me?.nickname || me?.username || "Wortwinkel",
      actorAvatarUrl: me?.avatar_url ?? null,
      link: "/profile/meldungen",
      message: statusMessage(status, r.title),
    });
  }
  revalidatePath("/profile/eingang");
  revalidatePath("/profile/meldungen");
  revalidatePath("/profile", "layout");
  return null;
}
