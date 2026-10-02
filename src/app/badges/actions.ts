"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { createNotification } from "@/lib/notifications";

const HEX = /^#[0-9a-fA-F]{6}$/;

export async function createBadgeDef(_prev: string | null, formData: FormData): Promise<string | null> {
  const name = String(formData.get("name") ?? "").trim().slice(0, 40);
  const description = String(formData.get("description") ?? "").trim().slice(0, 200);
  const icon = String(formData.get("icon") ?? "").trim().slice(0, 40);
  const color = String(formData.get("color") ?? "").trim();
  if (name.length < 2) return "Bitte einen Namen mit mindestens 2 Zeichen angeben.";
  if (!icon) return "Bitte ein Symbol angeben (Emoji oder :eigenes-emoji:).";
  if (!HEX.test(color)) return "Ungültige Farbe.";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";
  const world = await getActiveWorld(user.id);
  if (!world) return "Wähle zuerst eine Welt.";

  const { error } = await supabase
    .from("badge_defs")
    .insert({ world_id: world.id, name, description: description || null, icon, color, created_by: user.id });
  if (error) return error.message;
  revalidatePath("/badges", "layout");
  return null;
}

export async function deleteBadgeDef(defId: string): Promise<string | null> {
  const supabase = await createClient();
  const { error, count } = await supabase.from("badge_defs").delete({ count: "exact" }).eq("id", defId);
  if (error) return error.message;
  if (!count) return "Konnte nicht gelöscht werden.";
  revalidatePath("/badges", "layout");
  return null;
}

export async function awardBadge(defId: string, characterId: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const [{ data: def }, { data: character }] = await Promise.all([
    supabase.from("badge_defs").select("name, icon").eq("id", defId).maybeSingle(),
    supabase.from("characters").select("name, owner_id").eq("id", characterId).maybeSingle(),
  ]);
  if (!def || !character) return "Badge oder Charakter nicht gefunden.";

  const { error } = await supabase
    .from("badge_awards")
    .insert({ badge_key: `custom:${defId}`, character_id: characterId, def_id: defId, awarded_by: user.id });
  if (error) return error.code === "23505" ? `${character.name} hat dieses Badge schon.` : "Keine Berechtigung, dieses Badge zu verleihen.";

  if (character.owner_id !== user.id) {
    const { data: me } = await supabase.from("profiles").select("username, nickname, avatar_url").eq("id", user.id).maybeSingle();
    await createNotification(supabase, {
      userId: character.owner_id,
      type: "badge",
      actorName: me?.nickname || me?.username || "Jemand",
      actorAvatarUrl: me?.avatar_url ?? null,
      link: `/characters/${characterId}`,
      message: `hat dir das Badge ${def.icon} ${def.name} verliehen`,
      recipientName: character.name,
    }).catch(() => {});
  }
  revalidatePath("/badges", "layout");
  revalidatePath(`/characters/${characterId}`);
  return null;
}

export async function revokeBadge(awardId: string): Promise<string | null> {
  const supabase = await createClient();
  const { error, count } = await supabase.from("badge_awards").delete({ count: "exact" }).eq("id", awardId);
  if (error) return error.message;
  if (!count) return "Konnte nicht entzogen werden.";
  revalidatePath("/badges", "layout");
  return null;
}

// Haupt-Badge, das neben dem Namen erscheint (awardId = null entfernt es).
export async function setFeaturedBadge(
  target: { characterId: string } | { account: true },
  awardId: string | null,
): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  if ("characterId" in target) {
    const { error, count } = await supabase
      .from("characters")
      .update({ featured_badge_id: awardId }, { count: "exact" })
      .eq("id", target.characterId)
      .eq("owner_id", user.id);
    if (error) return error.message;
    if (!count) return "Keine Berechtigung.";
  } else {
    const { error } = await supabase.from("profiles").update({ featured_badge_id: awardId }).eq("id", user.id);
    if (error) return error.message;
  }
  revalidatePath("/", "layout");
  return null;
}

export type FeaturedBadge = { icon: string; name: string; color: string };

type FeaturedRow = {
  id: string;
  featured: {
    badge_key: string;
    def: { name: string; icon: string; color: string } | null;
  } | null;
};

// Für die Namens-Anzeige (Beiträge, Kommentare): Haupt-Badges mehrerer Charaktere/Accounts auf einmal.
export async function getFeaturedBadges(
  characterIds: string[],
  userIds: string[],
): Promise<{ characters: Record<string, FeaturedBadge>; users: Record<string, FeaturedBadge> }> {
  const { autoBadgeByKey } = await import("@/lib/badges");
  const supabase = await createClient();
  const resolve = (row: FeaturedRow): FeaturedBadge | null => {
    if (!row.featured) return null;
    if (row.featured.def) return row.featured.def;
    const auto = autoBadgeByKey(row.featured.badge_key);
    return auto ? { icon: auto.icon, name: auto.name, color: auto.color } : null;
  };
  const select = "id, featured:featured_badge_id(badge_key, def:def_id(name, icon, color))";
  const [chars, users] = await Promise.all([
    characterIds.length
      ? supabase.from("characters").select(select).in("id", characterIds.slice(0, 100)).returns<FeaturedRow[]>()
      : Promise.resolve({ data: [] as FeaturedRow[] }),
    userIds.length
      ? supabase.from("profiles").select(select).in("id", userIds.slice(0, 100)).returns<FeaturedRow[]>()
      : Promise.resolve({ data: [] as FeaturedRow[] }),
  ]);
  const out = { characters: {} as Record<string, FeaturedBadge>, users: {} as Record<string, FeaturedBadge> };
  for (const r of chars.data ?? []) {
    const b = resolve(r);
    if (b) out.characters[r.id] = b;
  }
  for (const r of users.data ?? []) {
    const b = resolve(r);
    if (b) out.users[r.id] = b;
  }
  return out;
}
