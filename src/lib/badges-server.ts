import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";
import { AUTO_BADGES, autoBadgeByKey, type AutoBadgeDef, type BadgeView } from "@/lib/badges";

type Supabase = Awaited<ReturnType<typeof createClient>>;

type AwardRow = {
  id: string;
  badge_key: string;
  awarded_at: string;
  def_id: string | null;
  def: { name: string; description: string | null; icon: string; color: string } | null;
  awarder: { username: string; nickname: string | null } | null;
};

const AWARD_SELECT =
  "id, badge_key, awarded_at, def_id, def:def_id(name, description, icon, color), awarder:awarded_by(username, nickname)";

function toView(row: AwardRow): BadgeView | null {
  if (row.badge_key.startsWith("custom:")) {
    if (!row.def) return null;
    return {
      awardId: row.id,
      key: row.badge_key,
      kind: "custom",
      name: row.def.name,
      description: row.def.description ?? "",
      icon: row.def.icon,
      color: row.def.color,
      awardedAt: row.awarded_at,
      awardedByName: row.awarder?.nickname || row.awarder?.username || null,
      defId: row.def_id,
    };
  }
  const auto = autoBadgeByKey(row.badge_key);
  if (!auto) return null;
  return {
    awardId: row.id,
    key: row.badge_key,
    kind: auto.scope === "account" ? "account" : "auto",
    name: auto.name,
    description: auto.description,
    icon: auto.icon,
    color: auto.color,
    awardedAt: row.awarded_at,
  };
}

export async function getCharacterBadges(characterId: string): Promise<BadgeView[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("badge_awards")
    .select(AWARD_SELECT)
    .eq("character_id", characterId)
    .order("awarded_at", { ascending: true })
    .returns<AwardRow[]>();
  return (data ?? []).map(toView).filter((b): b is BadgeView => Boolean(b));
}

export async function getAccountBadges(userId: string): Promise<BadgeView[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("badge_awards")
    .select(AWARD_SELECT)
    .eq("user_id", userId)
    .order("awarded_at", { ascending: true })
    .returns<AwardRow[]>();
  return (data ?? []).map(toView).filter((b): b is BadgeView => Boolean(b));
}

async function count(q: PromiseLike<{ count: number | null }>): Promise<number> {
  return (await q).count ?? 0;
}

export async function characterMetrics(supabase: Supabase, characterId: string) {
  const head = { count: "exact", head: true } as const;
  const [posts, comments, story, followers, likes] = await Promise.all([
    count(supabase.from("posts").select("id", head).eq("character_id", characterId)),
    count(supabase.from("comments").select("id", head).eq("character_id", characterId)),
    count(supabase.from("story_entries").select("id", head).eq("character_id", characterId)),
    count(supabase.from("character_follows").select("follower_id", head).eq("followed_id", characterId)),
    count(
      supabase
        .from("reactions")
        .select("id, posts!inner(character_id)", head)
        .eq("emoji", "❤️")
        .eq("posts.character_id", characterId),
    ),
  ]);
  return { posts, comments, story, followers, likes } as Record<string, number>;
}

export async function accountMetrics(supabase: Supabase, userId: string) {
  const head = { count: "exact", head: true } as const;
  const [redPosts, redComments, redReactions, pollRows] = await Promise.all([
    count(supabase.from("redaktion_posts").select("id", head).eq("author_id", userId)),
    count(supabase.from("redaktion_comments").select("id", head).eq("author_id", userId)),
    count(
      supabase
        .from("redaktion_reactions")
        .select("id, redaktion_posts!inner(author_id)", head)
        .eq("redaktion_posts.author_id", userId),
    ),
    supabase.from("redaktion_poll_options").select("post_id, redaktion_posts!inner(author_id)").eq("redaktion_posts.author_id", userId),
  ]);
  const polls = new Set((pollRows.data ?? []).map((r) => r.post_id as string)).size;
  return { red_posts: redPosts, red_comments: redComments, red_reactions: redReactions, red_polls: polls } as Record<string, number>;
}

function earned(defs: AutoBadgeDef[], metrics: Record<string, number>) {
  return defs.filter((d) => (metrics[d.metric] ?? 0) >= d.threshold);
}

// Vergibt neu erreichte automatische Erfolge eines eigenen Charakters und benachrichtigt (nur die Besitzer:in ruft das auf).
export async function syncCharacterBadges(characterId: string): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: character } = await supabase
    .from("characters")
    .select("id, name, owner_id, avatar_url")
    .eq("id", characterId)
    .maybeSingle();
  if (!character || character.owner_id !== user.id) return [];

  const [{ data: existing }, metrics] = await Promise.all([
    supabase.from("badge_awards").select("badge_key").eq("character_id", characterId).like("badge_key", "auto:%"),
    characterMetrics(supabase, characterId),
  ]);
  const have = new Set((existing ?? []).map((r) => r.badge_key as string));
  const fresh = earned(
    AUTO_BADGES.filter((b) => b.scope === "character"),
    metrics,
  ).filter((b) => !have.has(b.key));
  if (!fresh.length) return [];

  const { error } = await supabase
    .from("badge_awards")
    .insert(fresh.map((b) => ({ badge_key: b.key, character_id: characterId })));
  if (error) return [];

  for (const b of fresh) {
    await createNotification(supabase, {
      userId: user.id,
      type: "badge",
      actorName: "Neues Badge",
      actorAvatarUrl: null,
      link: "/badges",
      message: `${b.icon} ${b.name} – ${b.description}`,
      recipientName: character.name,
    }).catch(() => {});
  }
  return fresh.map((b) => b.key);
}

export async function syncAccountBadges(): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const [{ data: existing }, metrics] = await Promise.all([
    supabase.from("badge_awards").select("badge_key").eq("user_id", user.id).like("badge_key", "account:%"),
    accountMetrics(supabase, user.id),
  ]);
  const have = new Set((existing ?? []).map((r) => r.badge_key as string));
  const fresh = earned(
    AUTO_BADGES.filter((b) => b.scope === "account"),
    metrics,
  ).filter((b) => !have.has(b.key));
  if (!fresh.length) return [];

  const { error } = await supabase.from("badge_awards").insert(fresh.map((b) => ({ badge_key: b.key, user_id: user.id })));
  if (error) return [];
  for (const b of fresh) {
    await createNotification(supabase, {
      userId: user.id,
      type: "badge",
      actorName: "Neues Redaktions-Abzeichen",
      actorAvatarUrl: null,
      link: "/badges",
      message: `${b.icon} ${b.name} – ${b.description}`,
    }).catch(() => {});
  }
  return fresh.map((b) => b.key);
}
