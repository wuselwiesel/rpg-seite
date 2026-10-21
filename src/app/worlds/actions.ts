"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { permissionsFromForm, strictPermissions, parsePermissions } from "@/lib/world-permissions";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_CHARACTER_COOKIE, ACTIVE_WORLD_COOKIE, SELECTION_COOKIE_OPTIONS } from "@/lib/types";
import { isDefaultTalents, parseTalentConfig } from "@/lib/talents";
import { isDefaultNatures, parseNatureConfig } from "@/lib/natures";
import { sanitizePostHtml } from "@/lib/sanitize";
import { notifyWorldAdmins } from "@/lib/world-admin-notify";
import { createNotification } from "@/lib/notifications";
import { parseMutedEvents } from "@/lib/world-admin-events";

// Beitrittsart aus dem Formular: offen (Standard), auf Anfrage oder nur Einladung
function parseJoinMode(raw: FormDataEntryValue | null): "open" | "request" | "invite" {
  return raw === "request" || raw === "invite" ? raw : "open";
}

// Erkunden vor dem Beitritt: aus (Standard), nur Info oder alles
function parsePreview(raw: FormDataEntryValue | null): "none" | "info" | "full" {
  return raw === "info" || raw === "full" ? raw : "none";
}

export async function createWorld(_prevState: string | null, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!name) return "Bitte einen Namen für die Welt angeben.";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { data: world, error } = await supabase
    .from("worlds")
    .insert({ name, description: description || null, created_by: user.id, is_public: formData.get("is_public") === "on", dice_enabled: formData.get("dice_enabled") === "on", join_mode: parseJoinMode(formData.get("join_mode")), preview: parsePreview(formData.get("preview")), permissions: permissionsFromForm(formData, strictPermissions()), allow_secrets: formData.get("allow_secrets") === "on" })
    .select("id")
    .single();

  if (error || !world) return error?.message ?? "Welt konnte nicht erstellt werden.";

  const { error: memberError } = await supabase
    .from("world_members")
    .insert({ world_id: world.id, user_id: user.id });

  if (memberError) return memberError.message;

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WORLD_COOKIE, world.id, SELECTION_COOKIE_OPTIONS);
  cookieStore.delete(ACTIVE_CHARACTER_COOKIE);

  revalidatePath("/", "layout");
  // Die Besitzer:in landet auf der Weltseite (Verwaltung) statt im Charakterformular
  redirect(`/worlds/${world.id}`);
}

// backTo: nur das Wiki darf als Ziel angegeben werden (sonst Startseite).
export async function setActiveWorld(worldId: string, backTo?: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WORLD_COOKIE, worldId, SELECTION_COOKIE_OPTIONS);
  cookieStore.delete(ACTIVE_CHARACTER_COOKIE);
  revalidatePath("/", "layout");
  redirect(backTo === "/wiki" ? "/wiki" : "/");
}

// Öffnet eine Seite in der Welt, zu der sie gehört (z. B. aus einer Benachrichtigung): wechselt dorthin, lädt Seitenleiste und
// Charakter neu und leitet weiter. Ohne Mitgliedschaft wird nur weitergeleitet.
export async function openInWorld(worldId: string, path: string) {
  const target = path.startsWith("/") && !path.startsWith("//") ? path : "/";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(target)}`);

  const { data: membership } = await supabase.from("world_members").select("world_id").eq("world_id", worldId).eq("user_id", user.id).maybeSingle();
  if (membership) {
    const cookieStore = await cookies();
    if (cookieStore.get(ACTIVE_WORLD_COOKIE)?.value !== worldId) {
      cookieStore.set(ACTIVE_WORLD_COOKIE, worldId, SELECTION_COOKIE_OPTIONS);
      cookieStore.delete(ACTIVE_CHARACTER_COOKIE);
    }
    revalidatePath("/", "layout");
  }
  redirect(target);
}

export async function joinWorld(worldId: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { data: target } = await supabase.from("worlds").select("join_mode, created_by").eq("id", worldId).maybeSingle<{ join_mode: string; created_by: string }>();
  if (target && target.join_mode !== "open" && target.created_by !== user.id) {
    return target.join_mode === "request" ? "Diese Welt braucht eine Anfrage." : "In diese Welt kommt man nur auf Einladung.";
  }

  const { data: existing } = await supabase
    .from("world_members")
    .select("world_id")
    .eq("world_id", worldId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase
      .from("world_members")
      .insert({ world_id: worldId, user_id: user.id });

    if (error) return error.message;
    await notifyWorldAdmins(supabase, worldId, "member_join", user.id, "ist der Welt beigetreten");
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WORLD_COOKIE, worldId, SELECTION_COOKIE_OPTIONS);
  cookieStore.delete(ACTIVE_CHARACTER_COOKIE);

  revalidatePath("/", "layout");
  // Ein Charakter ist nicht nötig: man darf die Welt erst erkunden
  redirect("/");
}

// Freund:in in die Welt einladen: die Person bekommt eine Benachrichtigung und nimmt die Einladung an oder lehnt sie ab
// (erst mit der Zusage wird sie Mitglied, siehe respondWorldInvite).
export async function inviteToWorld(
  worldId: string,
  _prevState: string | null,
  formData: FormData,
) {
  const friendUserId = String(formData.get("friend_user_id") ?? "");
  if (!friendUserId) return "Bitte eine Freundin oder einen Freund auswählen.";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { error } = await supabase.rpc("invite_to_world", { p_world: worldId, p_user: friendUserId });
  if (error) return error.message;

  const [{ data: me }, { data: world }] = await Promise.all([
    supabase.from("profiles").select("username, nickname, avatar_url").eq("id", user.id).maybeSingle<{ username: string; nickname: string | null; avatar_url: string | null }>(),
    supabase.from("worlds").select("name").eq("id", worldId).maybeSingle<{ name: string }>(),
  ]);
  await createNotification(supabase, {
    userId: friendUserId,
    type: "world_invite",
    actorName: me?.nickname || me?.username || "Jemand",
    actorAvatarUrl: me?.avatar_url ?? null,
    link: "/worlds",
    message: `hat dich in die Welt „${world?.name ?? "eine Welt"}“ eingeladen`,
  });

  revalidatePath(`/worlds/${worldId}`);
  return null;
}

// Alle Einstellungen einer Welt in einem Zug speichern (Besitzer:in und Admins): Titelbild, Name, Beschreibung, Erkunden, Beitritt,
// Rechte, Willkommenstext und – wenn das Feld mitkommt – die Talentliste. Bleibt auf der Seite und meldet „ok“.
export async function saveWorldSettings(worldId: string, _prevState: string | null, formData: FormData): Promise<string | null> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const coverImageUrl = String(formData.get("cover_image_url") ?? "").trim();

  if (!name) return "Bitte einen Namen für die Welt angeben.";

  const patch: Record<string, unknown> = {
    name,
    description: description || null,
    cover_image_url: coverImageUrl || null,
    dice_enabled: formData.get("dice_enabled") === "on",
    fate_enabled: formData.get("fate_enabled") === "on",
    house_enabled: formData.get("house_enabled") === "on",
    quote_enabled: formData.get("quote_enabled") === "on",
    status_enabled: formData.get("status_enabled") === "on",
    is_public: formData.get("is_public") === "on",
    join_mode: parseJoinMode(formData.get("join_mode")),
    preview: parsePreview(formData.get("preview")),
    permissions: permissionsFromForm(formData, parsePermissions({})),
    allow_secrets: formData.get("allow_secrets") === "on",
    review_characters: formData.get("review_characters") === "on",
    cast_enabled: formData.get("cast_enabled") === "on",
  };

  if (formData.has("welcome")) {
    const html = sanitizePostHtml(String(formData.get("welcome") ?? "").trim());
    const text = html.replace(/<[^>]*>/g, "").trim();
    patch.welcome_html = text || /<img/i.test(html) ? html : null;
  }

  // Die Talentliste fehlt im Formular, solange Würfeln aus ist: dann bleibt sie unverändert
  if (formData.has("talents")) {
    let raw: unknown;
    try {
      raw = JSON.parse(String(formData.get("talents") ?? "[]"));
    } catch {
      return "Die Talentliste ist ungültig.";
    }
    const list = parseTalentConfig(raw);
    patch.talent_config = isDefaultTalents(list) ? null : list;
  }

  // Wie die Talente: fehlt das Feld (Würfeln aus), bleibt die Liste der Naturen unverändert
  if (formData.has("natures")) {
    let raw: unknown;
    try {
      raw = JSON.parse(String(formData.get("natures") ?? "[]"));
    } catch {
      return "Die Liste der Naturen ist ungültig.";
    }
    const list = parseNatureConfig(raw);
    patch.nature_config = isDefaultNatures(list) ? null : list;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  // Besitzer:in und Admins dürfen die Welt bearbeiten (Policy worlds_update_own prüft das; 0 Zeilen = keine Berechtigung)
  const { error, count } = await supabase.from("worlds").update(patch, { count: "exact" }).eq("id", worldId);
  if (error) return error.message;
  if (!count) return "Das dürfen nur die Besitzer:in und Admins der Welt.";

  revalidatePath(`/worlds/${worldId}`);
  revalidatePath(`/worlds/${worldId}/edit`);
  revalidatePath("/worlds");
  revalidatePath("/characters", "layout");
  revalidatePath("/", "layout");
  return "ok";
}

export async function followWorld(worldId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("world_follows").upsert({ world_id: worldId, user_id: user.id });
  revalidatePath("/search");
  revalidatePath("/");
}

export async function unfollowWorld(worldId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("world_follows").delete().eq("world_id", worldId).eq("user_id", user.id);
  revalidatePath("/search");
  revalidatePath("/");
}

export async function deleteWorld(worldId: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { error, count } = await supabase
    .from("worlds")
    .delete({ count: "exact" })
    .eq("id", worldId)
    .eq("created_by", user.id);

  if (error) return error.message;
  if (!count) return "Welt konnte nicht gelöscht werden. Bitte später erneut versuchen.";

  const cookieStore = await cookies();
  if (cookieStore.get(ACTIVE_WORLD_COOKIE)?.value === worldId) {
    cookieStore.delete(ACTIVE_WORLD_COOKIE);
    cookieStore.delete(ACTIVE_CHARACTER_COOKIE);
  }

  revalidatePath("/", "layout");
  redirect("/worlds");
}

// Mitglied aus der Welt entfernen: die Besitzer:in jede:n, Admins nur normale Mitglieder (Policy world_members_delete_own). Charaktere bleiben bestehen.
export async function removeWorldMember(worldId: string, userId: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  if (userId === user.id) return "Zum Verlassen der Welt gibt es „Welt verlassen“.";

  const { data: removed } = await supabase.from("profiles").select("username, nickname").eq("id", userId).maybeSingle<{ username: string; nickname: string | null }>();
  const { error, count } = await supabase.from("world_members").delete({ count: "exact" }).eq("world_id", worldId).eq("user_id", userId);
  if (error) return error.message;
  if (!count) return "Dieses Mitglied kannst du nicht entfernen.";
  await notifyWorldAdmins(supabase, worldId, "leave", user.id, `hat ${removed?.nickname || removed?.username || "ein Mitglied"} aus der Welt entfernt`);

  revalidatePath(`/worlds/${worldId}`);
  revalidatePath("/", "layout");
  return null;
}

// Mitglied zum Admin ernennen oder zurückstufen – nur die Besitzer:in.
export async function setWorldMemberRole(worldId: string, userId: string, role: "member" | "admin"): Promise<string | null> {
  if (role !== "member" && role !== "admin") return "Unbekannte Rolle.";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { error, count } = await supabase.from("world_members").update({ role }, { count: "exact" }).eq("world_id", worldId).eq("user_id", userId);
  if (error) return error.message;
  if (!count) return "Das darf nur die Besitzer:in der Welt.";

  revalidatePath(`/worlds/${worldId}`);
  revalidatePath("/", "layout");
  return null;
}

// Besitz einer Welt an ein Mitglied übertragen (nur die Besitzer:in); die bisherige Besitzer:in wird Admin.
export async function transferWorldOwnership(worldId: string, userId: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const { error } = await supabase.rpc("transfer_world_ownership", { p_world: worldId, p_new_owner: userId });
  if (error) return error.message;
  revalidatePath(`/worlds/${worldId}`);
  revalidatePath("/", "layout");
  return null;
}

export async function leaveWorld(worldId: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  // Die Besitzer:in kann nicht einfach gehen: erst Besitz übertragen oder die Welt löschen
  const { data: world } = await supabase.from("worlds").select("created_by").eq("id", worldId).maybeSingle<{ created_by: string }>();
  if (world?.created_by === user.id) return "Als Besitzer:in überträgst du erst den Besitz an ein anderes Mitglied oder löschst die Welt.";

  // Erst melden, solange die Person noch Mitglied ist (sonst darf sie die Admins nicht abfragen)
  await notifyWorldAdmins(supabase, worldId, "leave", user.id, "hat die Welt verlassen");
  const { error } = await supabase.from("world_members").delete().eq("world_id", worldId).eq("user_id", user.id);
  if (error) return error.message;

  const cookieStore = await cookies();
  if (cookieStore.get(ACTIVE_WORLD_COOKIE)?.value === worldId) {
    cookieStore.delete(ACTIVE_WORLD_COOKIE);
    cookieStore.delete(ACTIVE_CHARACTER_COOKIE);
  }

  revalidatePath("/", "layout");
  redirect("/worlds");
}

// Eigene Admin-Meldungen dieser Welt: `muted` sind die ausgeschalteten Ereignisse (nur für die angemeldete Person; die Policy sichert das)
export async function setAdminNotifyMuted(worldId: string, muted: string[]): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const { error } = await supabase
    .from("world_admin_notify_prefs")
    .upsert({ world_id: worldId, user_id: user.id, muted_events: parseMutedEvents(muted), updated_at: new Date().toISOString() });
  if (error) return error.code === "42501" ? "Das geht nur für Admins dieser Welt." : error.message;
  return null;
}

// Einladungslink einer Welt (Admins): den aktiven Schlüssel liefern, sonst einen neuen anlegen
export async function getInviteToken(worldId: string): Promise<{ token: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };
  const { data: existing } = await supabase
    .from("world_invites")
    .select("token")
    .eq("world_id", worldId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ token: string }>();
  if (existing) return { token: existing.token };
  const { data, error } = await supabase.from("world_invites").insert({ world_id: worldId, created_by: user.id }).select("token").single<{ token: string }>();
  if (error || !data) return { error: error?.code === "42501" ? "Einladungslinks erstellen nur Admins der Welt." : (error?.message ?? "Der Link konnte nicht erstellt werden.") };
  return { token: data.token };
}

// Alten Einladungslink ungültig machen und einen neuen anlegen
export async function renewInviteToken(worldId: string): Promise<{ token: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };
  const { error } = await supabase.from("world_invites").update({ revoked_at: new Date().toISOString() }).eq("world_id", worldId).is("revoked_at", null);
  if (error) return { error: error.message };
  return getInviteToken(worldId);
}

// Mit Einladungslink beitreten: gilt auch für „Nur auf Einladung“ und „Auf Anfrage“
export async function joinWithInvite(worldId: string, token: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { data: wasMember } = await supabase.from("world_members").select("world_id").eq("world_id", worldId).eq("user_id", user.id).maybeSingle();
  const { data: err, error } = await supabase.rpc("join_world_by_invite", { p_world: worldId, p_token: token });
  if (error) return error.message;
  if (err) return err as string;
  if (!wasMember) await notifyWorldAdmins(supabase, worldId, "member_join", user.id, "ist der Welt per Einladungslink beigetreten");

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WORLD_COOKIE, worldId, SELECTION_COOKIE_OPTIONS);
  cookieStore.delete(ACTIVE_CHARACTER_COOKIE);
  revalidatePath("/", "layout");
  redirect("/");
}
