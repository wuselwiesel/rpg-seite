"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { getActiveCharacter } from "@/lib/active-character";
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

// Verleiht ein Welt-Badge. `asCharacterId` = der Charakter, der es verleiht (muss dir gehören); ohne Angabe der aktive.
export async function awardBadge(defId: string, characterId: string, asCharacterId?: string | null): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const [{ data: def }, { data: character }] = await Promise.all([
    supabase.from("badge_defs").select("name, icon, world_id").eq("id", defId).maybeSingle(),
    supabase.from("characters").select("name, owner_id").eq("id", characterId).maybeSingle(),
  ]);
  if (!def || !character) return "Badge oder Charakter nicht gefunden.";

  // Verleihender Charakter: gewählt oder aktiv; muss dem eigenen Account gehören.
  let awarder: { id: string; name: string; avatar_url: string | null } | null = null;
  if (asCharacterId) {
    const { data } = await supabase
      .from("characters")
      .select("id, name, avatar_url, owner_id")
      .eq("id", asCharacterId)
      .maybeSingle();
    if (!data || data.owner_id !== user.id) return "Du kannst nur mit deinen eigenen Charakteren verleihen.";
    awarder = { id: data.id, name: data.name, avatar_url: data.avatar_url };
  } else {
    const active = await getActiveCharacter(user.id, def.world_id);
    if (active) awarder = { id: active.id, name: active.name, avatar_url: active.avatar_url };
  }
  if (awarder && awarder.id === characterId) return "Ein Charakter kann sich nicht selbst ein Badge verleihen.";

  const base: Record<string, string> = { badge_key: `custom:${defId}`, character_id: characterId, def_id: defId, awarded_by: user.id };
  let { error } = await supabase
    .from("badge_awards")
    .insert(awarder ? { ...base, awarded_by_character_id: awarder.id } : base);
  // Solange die Migration für awarded_by_character_id fehlt, ohne diese Angabe verleihen.
  if (error && /awarded_by_character_id/.test(error.message)) {
    ({ error } = await supabase.from("badge_awards").insert(base));
  }
  if (error) return error.code === "23505" ? `${character.name} hat dieses Badge schon.` : "Keine Berechtigung, dieses Badge zu verleihen.";

  // Benachrichtigung an die Besitzer:in des Charakters: "<Verleihender Charakter> hat dir das Badge … verliehen".
  if (character.owner_id !== user.id) {
    const { data: me } = await supabase.from("profiles").select("username, nickname, avatar_url").eq("id", user.id).maybeSingle();
    await createNotification(supabase, {
      userId: character.owner_id,
      type: "badge",
      actorName: awarder?.name ?? (me?.nickname || me?.username || "Jemand"),
      actorAvatarUrl: awarder?.avatar_url ?? me?.avatar_url ?? null,
      link: `/badges/sammlung/${characterId}?badge=${encodeURIComponent(`custom:${defId}`)}`,
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
  if (!count) return "Konnte nicht entfernt werden.";
  revalidatePath("/", "layout");
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

export type FeaturedBadge = { key?: string; icon: string; name: string; color: string };

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
): Promise<{
  characters: Record<string, FeaturedBadge>;
  users: Record<string, FeaturedBadge>;
  symbols: { characters: Record<string, string>; users: Record<string, string> };
}> {
  const { autoBadgeByKey } = await import("@/lib/badges");
  const supabase = await createClient();
  const resolve = (row: FeaturedRow): FeaturedBadge | null => {
    if (!row.featured) return null;
    if (row.featured.def) return { key: row.featured.badge_key, ...row.featured.def };
    const auto = autoBadgeByKey(row.featured.badge_key);
    return auto ? { key: row.featured.badge_key, icon: auto.icon, name: auto.name, color: auto.color } : null;
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
  const out = {
    characters: {} as Record<string, FeaturedBadge>,
    users: {} as Record<string, FeaturedBadge>,
    symbols: { characters: {} as Record<string, string>, users: {} as Record<string, string> },
  };
  // Frei gewähltes Zeichen neben dem Namen (eigene, tolerante Abfragen: ohne die Spalte einfach keine Zeichen).
  const [charSymbols, userSymbols] = await Promise.all([
    characterIds.length
      ? supabase.from("characters").select("id, name_symbol").in("id", characterIds.slice(0, 100)).not("name_symbol", "is", null)
      : Promise.resolve({ data: [] }),
    userIds.length
      ? supabase.from("redaktion_profiles").select("user_id, name_symbol").in("user_id", userIds.slice(0, 100)).not("name_symbol", "is", null)
      : Promise.resolve({ data: [] }),
  ]);
  for (const r of (charSymbols.data ?? []) as { id: string; name_symbol: string }[]) out.symbols.characters[r.id] = r.name_symbol;
  for (const r of (userSymbols.data ?? []) as { user_id: string; name_symbol: string }[]) out.symbols.users[r.user_id] = r.name_symbol;
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

// Badge ein-/ausblenden (Profil, Sammlung anderer, Verlauf). Ein ausgeblendetes Haupt-Badge wird auch neben dem Namen entfernt.
export async function setBadgeHidden(awardId: string, hidden: boolean): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Nicht angemeldet.";

  const { error, count } = await supabase.from("badge_awards").update({ hidden }, { count: "exact" }).eq("id", awardId);
  if (error) {
    return /hidden|column|permission denied/i.test(error.message)
      ? `Die Datenbank ist noch nicht vorbereitet (supabase/migration_badge_hidden.sql im Supabase-SQL-Editor ausführen). Technisch: ${error.message}`
      : error.message;
  }
  if (!count) return "Keine Berechtigung.";

  if (hidden) {
    await Promise.all([
      supabase.from("characters").update({ featured_badge_id: null }).eq("featured_badge_id", awardId).eq("owner_id", user.id),
      supabase.from("profiles").update({ featured_badge_id: null }).eq("featured_badge_id", awardId).eq("id", user.id),
    ]);
  }
  revalidatePath("/", "layout");
  return null;
}
