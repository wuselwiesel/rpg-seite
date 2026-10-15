import "server-only";
import { createClient } from "@/lib/supabase/server";
import { friendStatusMap, type FriendStatus } from "@/lib/friend-status";
import { getOfficialAccountId } from "@/lib/account-marks";

export type WelcomeCard = {
  id: string;
  userId: string;
  username: string;
  name: string;
  avatarUrl: string | null;
  worldName: string | null;
  greeted: boolean;
  status: FriendStatus;
};

export type FriendSuggestion = { userId: string; username: string; name: string; avatarUrl: string | null; worlds: string[]; status: FriendStatus };

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

async function myFriendships(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("friendships")
    .select("requester_id, addressee_id, status")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .returns<{ requester_id: string; addressee_id: string; status: "pending" | "accepted" }[]>();
  return friendStatusMap(data ?? [], userId);
}

// Willkommens-Karten der letzten sieben Tage (Welten, in denen ich Mitglied bin, und App-weite mit Zustimmung); ohne mich selbst
export async function getWelcomeCards(userId: string): Promise<WelcomeCard[]> {
  const supabase = await createClient();
  const since = new Date(Date.now() - WEEK_MS).toISOString();
  const [{ data: rows }, status, officialId] = await Promise.all([
    supabase
      .from("welcome_announcements")
      .select("id, user_id, world_id, created_at, profiles!welcome_announcements_user_id_fkey(username, nickname, avatar_url), worlds(name)")
      .gt("created_at", since)
      .neq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20)
      .returns<{ id: string; user_id: string; world_id: string | null; created_at: string; profiles: { username: string; nickname: string | null; avatar_url: string | null } | null; worlds: { name: string } | null }[]>(),
    myFriendships(userId),
    getOfficialAccountId(),
  ]);
  const list = (rows ?? []).filter((r) => r.user_id !== officialId);
  if (list.length === 0) return [];
  const { data: greetings } = await supabase.from("welcome_greetings").select("announcement_id").in("announcement_id", list.map((r) => r.id)).returns<{ announcement_id: string }[]>();
  const greeted = new Set((greetings ?? []).map((g) => g.announcement_id));
  // Pro Person nur die jüngste Karte
  const seen = new Set<string>();
  const out: WelcomeCard[] = [];
  for (const r of list) {
    if (seen.has(r.user_id) || !r.profiles) continue;
    seen.add(r.user_id);
    out.push({
      id: r.id,
      userId: r.user_id,
      username: r.profiles.username,
      name: r.profiles.nickname || r.profiles.username,
      avatarUrl: r.profiles.avatar_url,
      worldName: r.worlds?.name ?? null,
      greeted: greeted.has(r.id),
      status: status.get(r.user_id) ?? "none",
    });
  }
  return out;
}

// „Kennst du schon?“: Mitglieder meiner Welten, mit denen ich noch nicht befreundet bin
export async function getFriendSuggestions(userId: string, limit = 12): Promise<FriendSuggestion[]> {
  const supabase = await createClient();
  const [{ data: mine }, status, officialId] = await Promise.all([
    supabase.from("world_members").select("world_id").eq("user_id", userId).returns<{ world_id: string }[]>(),
    myFriendships(userId),
    getOfficialAccountId(),
  ]);
  const worldIds = (mine ?? []).map((m) => m.world_id);
  if (worldIds.length === 0) return [];
  const { data: others } = await supabase
    .from("world_members")
    .select("user_id, world_id, joined_at, profiles(username, nickname, avatar_url), worlds(name)")
    .in("world_id", worldIds)
    .neq("user_id", userId)
    .returns<{ user_id: string; world_id: string; joined_at: string; profiles: { username: string; nickname: string | null; avatar_url: string | null } | null; worlds: { name: string } | null }[]>();

  const byUser = new Map<string, { s: FriendSuggestion; recent: string }>();
  for (const o of others ?? []) {
    if (!o.profiles || o.user_id === officialId || status.has(o.user_id)) continue;
    if (o.profiles.username.toLowerCase() === "geloescht") continue;
    const cur = byUser.get(o.user_id);
    const world = o.worlds?.name;
    if (cur) {
      if (world && !cur.s.worlds.includes(world)) cur.s.worlds.push(world);
      if (o.joined_at > cur.recent) cur.recent = o.joined_at;
    } else {
      byUser.set(o.user_id, {
        s: { userId: o.user_id, username: o.profiles.username, name: o.profiles.nickname || o.profiles.username, avatarUrl: o.profiles.avatar_url, worlds: world ? [world] : [], status: "none" },
        recent: o.joined_at,
      });
    }
  }
  return [...byUser.values()]
    .sort((a, b) => b.s.worlds.length - a.s.worlds.length || b.recent.localeCompare(a.recent))
    .slice(0, limit)
    .map((x) => x.s);
}

export { myFriendships };
