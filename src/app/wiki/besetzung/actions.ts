"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";
import { notifyWorldAdmins } from "@/lib/world-admin-notify";
import { parseCastHtml, suggestLinks, type ParsedRole } from "@/lib/cast";

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function me(supabase: Supabase) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("username, nickname, avatar_url").eq("id", user.id).maybeSingle<{ username: string; nickname: string | null; avatar_url: string | null }>();
  return { id: user.id, name: data?.nickname || data?.username || "Jemand", avatarUrl: data?.avatar_url ?? null };
}

function refresh() {
  revalidatePath("/wiki/besetzung");
  revalidatePath("/characters");
  revalidatePath("/", "layout");
}

// Mitglied fragt eine Rolle an (mit Begründung); die Admins bekommen eine Meldung
export async function requestRole(roleId: string, message: string): Promise<string | null> {
  const supabase = await createClient();
  const who = await me(supabase);
  if (!who) return "Nicht angemeldet.";
  const { data, error } = await supabase.rpc("request_role", { p_role: roleId, p_message: message.trim().slice(0, 500) });
  if (error) return error.message;
  const r = data as { world_id: string; role_name: string };
  await notifyWorldAdmins(supabase, r.world_id, "role_request", who.id, `möchte die Rolle ${r.role_name} spielen`, "/wiki/besetzung");
  refresh();
  return null;
}

export async function withdrawRoleRequest(requestId: string): Promise<string | null> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("withdraw_role_request", { p_request: requestId });
  if (error) return error.message;
  refresh();
  return null;
}

// Admin sagt zu oder lehnt ab; die Person bekommt eine Meldung. Nach der Zusage legt sie den Charakter selbst an (Name vorausgefüllt).
export async function decideRoleRequest(requestId: string, approve: boolean): Promise<string | null> {
  const supabase = await createClient();
  const who = await me(supabase);
  if (!who) return "Nicht angemeldet.";
  const { data, error } = await supabase.rpc("decide_role_request", { p_request: requestId, p_approve: approve });
  if (error) return error.message;
  const r = data as { world_id: string; role_id: string; role_name: string; user_id: string; approved: boolean };
  await createNotification(supabase, {
    userId: r.user_id,
    type: "character_claim_result",
    actorName: who.name,
    actorAvatarUrl: who.avatarUrl,
    link: approve ? `/characters/new?rolle=${r.role_id}` : "/wiki/besetzung",
    message: approve ? `hat dir die Rolle ${r.role_name} zugesagt. Lege jetzt deinen Charakter an` : `hat deine Anfrage für ${r.role_name} abgelehnt`,
  });
  refresh();
  return null;
}

// Reservieren für ein Mitglied oder einen frei eingetragenen Namen (Frist optional); ohne Person wird aufgehoben
export async function setRoleHolder(roleId: string, userId: string | null, label: string, until: string | null): Promise<string | null> {
  const supabase = await createClient();
  let untilIso: string | null = null;
  if (until) {
    const d = new Date(`${until}T23:59:59`);
    if (Number.isNaN(d.getTime())) return "Das Datum ist ungültig.";
    untilIso = d.toISOString();
  }
  const { error } = await supabase.rpc("set_role_holder", { p_role: roleId, p_user: userId || null, p_label: label.trim().slice(0, 80), p_until: untilIso });
  if (error) return error.message;
  refresh();
  return null;
}

export async function setRoleState(roleId: string, state: "open" | "npc"): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("world_roles").update({ state }).eq("id", roleId).select("id");
  if (error) return error.message;
  if (!data?.length) return "Das dürfen nur Admins der Welt.";
  refresh();
  return null;
}

export async function deleteRole(roleId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("world_roles").delete().eq("id", roleId).select("id");
  if (error) return error.message;
  if (!data?.length) return "Das dürfen nur Admins der Welt.";
  refresh();
  return null;
}

export type RoleInput = { name: string; age_text: string; species_text: string; source: string; description: string; deceased: boolean };

// Neue Rolle anlegen (roleId leer) oder bestehende ändern
export async function saveRole(worldId: string, roleId: string | null, input: RoleInput): Promise<string | null> {
  const supabase = await createClient();
  const who = await me(supabase);
  if (!who) return "Nicht angemeldet.";
  const name = input.name.trim().slice(0, 160);
  if (!name) return "Bitte einen Namen angeben.";
  const fields = {
    name,
    age_text: input.age_text.trim().slice(0, 60) || null,
    species_text: input.species_text.trim().slice(0, 120) || null,
    source: input.source.trim().slice(0, 60) || null,
    description: input.description.trim().slice(0, 2000) || null,
    deceased: input.deceased,
  };
  const res = roleId
    ? await supabase.from("world_roles").update(fields).eq("id", roleId).select("id")
    : await supabase.from("world_roles").insert({ ...fields, world_id: worldId, created_by: who.id }).select("id");
  if (res.error) return res.error.message;
  if (!res.data?.length) return "Das dürfen nur Admins der Welt.";
  refresh();
  return null;
}

// Admin verknüpft einen bestehenden Charakter mit einer Rolle (oder löst die Verknüpfung)
export async function linkRoleCharacter(roleId: string, characterId: string | null): Promise<string | null> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("link_role_character", { p_role: roleId, p_character: characterId });
  if (error) return error.message;
  refresh();
  return null;
}

export async function setCastEnabled(worldId: string, enabled: boolean): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("worlds").update({ cast_enabled: enabled }).eq("id", worldId).select("id");
  if (error) return error.message;
  if (!data?.length) return "Das dürfen nur Admins der Welt.";
  refresh();
  revalidatePath(`/worlds/${worldId}/edit`);
  return null;
}

// Import: liest die Listenpunkte der Wiki-Seiten eines Ordners. Die Seiten selbst bleiben unverändert.
export type ImportPreview = {
  total: number;
  fresh: ParsedRole[];
  duplicates: number;
  unrecognized: number;
  links: { roleIndex: number; roleName: string; characterId: string; characterName: string }[];
};

export async function previewCastImport(worldId: string, folderId: string): Promise<{ error: string } | { preview: ImportPreview }> {
  const supabase = await createClient();
  const who = await me(supabase);
  if (!who) return { error: "Nicht angemeldet." };
  const [{ data: pages, error }, { data: existing }, { data: chars }] = await Promise.all([
    supabase.from("wiki_pages").select("title, content").eq("world_id", worldId).eq("folder_id", folderId).limit(500).returns<{ title: string; content: string | null }[]>(),
    supabase.from("world_roles").select("name, source").eq("world_id", worldId).limit(5000).returns<{ name: string; source: string | null }[]>(),
    supabase.from("characters").select("id, name").eq("world_id", worldId).eq("is_npc", false).is("deleted_at", null).limit(2000).returns<{ id: string; name: string }[]>(),
  ]);
  if (error) return { error: error.message };
  const parsed: ParsedRole[] = [];
  for (const p of pages ?? []) parsed.push(...parseCastHtml(p.content ?? ""));
  const key = (n: string, s: string | null) => `${n.toLocaleLowerCase("de")}|${(s ?? "").toLocaleLowerCase("de")}`;
  const have = new Set((existing ?? []).map((e) => key(e.name, e.source)));
  const seen = new Set<string>();
  const fresh: ParsedRole[] = [];
  let duplicates = 0;
  for (const r of parsed) {
    const k = key(r.name, r.source);
    if (have.has(k) || seen.has(k)) {
      duplicates += 1;
      continue;
    }
    seen.add(k);
    fresh.push(r);
  }
  const suggestions = suggestLinks(fresh.map((r, i) => ({ key: String(i), name: r.name })), chars ?? []);
  const charName = new Map((chars ?? []).map((c) => [c.id, c.name]));
  return {
    preview: {
      total: parsed.length,
      fresh,
      duplicates,
      unrecognized: fresh.filter((r) => !r.recognized).length,
      links: suggestions.map((s) => ({ roleIndex: Number(s.roleKey), roleName: fresh[Number(s.roleKey)].name, characterId: s.characterId, characterName: charName.get(s.characterId) ?? "?" })),
    },
  };
}

export async function runCastImport(worldId: string, folderId: string, linkIndexes: number[]): Promise<{ error: string } | { created: number; linked: number }> {
  const supabase = await createClient();
  const who = await me(supabase);
  if (!who) return { error: "Nicht angemeldet." };
  const prev = await previewCastImport(worldId, folderId);
  if ("error" in prev) return prev;
  const { fresh, links } = prev.preview;
  let created = 0;
  const ids: (string | null)[] = new Array(fresh.length).fill(null);
  for (let i = 0; i < fresh.length; i += 200) {
    const slice = fresh.slice(i, i + 200);
    const { data, error } = await supabase
      .from("world_roles")
      .insert(slice.map((r) => ({ world_id: worldId, created_by: who.id, name: r.name, age_text: r.age_text, species_text: r.species_text, source: r.source, description: r.description, deceased: r.deceased })))
      .select("id");
    if (error) return { error: `Nach ${created} Rollen abgebrochen: ${error.message}` };
    (data ?? []).forEach((row, j) => (ids[i + j] = row.id as string));
    created += data?.length ?? 0;
  }
  let linked = 0;
  const chosen = new Set(linkIndexes);
  for (const l of links) {
    const id = ids[l.roleIndex];
    if (!chosen.has(l.roleIndex) || !id) continue;
    const { error } = await supabase.rpc("link_role_character", { p_role: id, p_character: l.characterId });
    if (!error) linked += 1;
  }
  refresh();
  return { created, linked };
}
