"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";

// Neues Mitglied begrüßen: ein Klick, die Person bekommt eine Meldung
export async function greetNewMember(announcementId: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { data: a } = await supabase
    .from("welcome_announcements")
    .select("user_id, world_id, worlds(name)")
    .eq("id", announcementId)
    .maybeSingle<{ user_id: string; world_id: string | null; worlds: { name: string } | null }>();
  if (!a) return "Diese Karte gibt es nicht mehr.";
  if (a.user_id === user.id) return "Das bist du selbst.";

  const { error } = await supabase.from("welcome_greetings").insert({ announcement_id: announcementId, from_user: user.id });
  if (error) return error.code === "23505" ? null : error.message;

  const { data: me } = await supabase.from("profiles").select("username, nickname, avatar_url").eq("id", user.id).maybeSingle<{ username: string; nickname: string | null; avatar_url: string | null }>();
  await createNotification(supabase, {
    userId: a.user_id,
    type: "welcome_greeting",
    actorName: me?.nickname || me?.username || "Jemand",
    actorAvatarUrl: me?.avatar_url ?? null,
    link: a.world_id ? `/worlds/${a.world_id}` : "/friends",
    message: a.worlds?.name ? `hat dich in ${a.worlds.name} begrüßt` : "hat dich bei Wortwinkel begrüßt",
  });
  revalidatePath("/redaktion");
  return null;
}

// Einstellungen: Beitritte ankündigen, sich App-weit vorstellen
export async function setWelcomePrefs(announceJoins: boolean, introPublic: boolean): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const { error } = await supabase.rpc("set_welcome_prefs", { p_announce_joins: announceJoins, p_intro_public: introPublic });
  if (error) return error.message;
  revalidatePath("/redaktion");
  revalidatePath("/profile/konto");
  return null;
}
