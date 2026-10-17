"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";
import { isKind } from "@/lib/tickets";

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function actor(supabase: Supabase) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("username, nickname, avatar_url").eq("id", user.id).maybeSingle<{ username: string; nickname: string | null; avatar_url: string | null }>();
  return { id: user.id, name: data?.nickname || data?.username || "Jemand", avatarUrl: data?.avatar_url ?? null };
}

// Neue Meldung; die Betreiberin bekommt eine Benachrichtigung (ein Fehler dabei verhindert die Meldung nicht)
export async function createTicket(input: { kind: string; title: string; body: string; page: string; device: string }): Promise<string | null> {
  if (!isKind(input.kind)) return "Wähle eine Art.";
  const title = input.title.trim().slice(0, 120);
  if (!title) return "Der Titel fehlt.";
  const supabase = await createClient();
  const who = await actor(supabase);
  if (!who) return "Nicht angemeldet.";
  const { error } = await supabase.rpc("create_ticket", { p_kind: input.kind, p_title: title, p_body: input.body.trim().slice(0, 4000), p_page: input.page.trim().slice(0, 300), p_device: input.device.slice(0, 400) });
  if (error) return error.message;
  try {
    const { data } = await supabase.rpc("ticket_admin_recipients");
    const ids = (Array.isArray(data) ? data : []).filter((id): id is string => typeof id === "string");
    await Promise.all(
      ids.map((userId) => createNotification(supabase, { userId, type: "ticket_new", actorName: who.name, actorAvatarUrl: who.avatarUrl, link: "/profile/eingang", message: `hat eine Meldung geschrieben: ${title}` })),
    );
  } catch {
    // Meldungen sind nachrangig.
  }
  revalidatePath("/profile/meldungen");
  revalidatePath("/profile", "layout");
  return null;
}
