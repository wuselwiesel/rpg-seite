import { createClient } from "@/lib/supabase/server";

export type WorldMemberRole = "owner" | "admin" | "member";
export type WorldMember = { id: string; name: string; avatarUrl: string | null; role: WorldMemberRole };

// Alle Accounts, die in der Welt mitspielen (für Mitgliederliste und Online-Anzeige), mit ihrer Rolle in der Welt.
export async function getWorldMembers(worldId: string): Promise<WorldMember[]> {
  const supabase = await createClient();
  const [{ data }, { data: world }] = await Promise.all([
    supabase
      .from("world_members")
      .select("role, profiles(id, username, nickname, avatar_url)")
      .eq("world_id", worldId)
      .returns<{ role: string | null; profiles: { id: string; username: string; nickname: string | null; avatar_url: string | null } | null }[]>(),
    supabase.from("worlds").select("created_by").eq("id", worldId).maybeSingle<{ created_by: string }>(),
  ]);
  return (data ?? [])
    .filter((r): r is typeof r & { profiles: NonNullable<typeof r.profiles> } => Boolean(r.profiles))
    .map((r) => ({
      id: r.profiles.id,
      name: r.profiles.nickname || r.profiles.username,
      avatarUrl: r.profiles.avatar_url,
      role: (r.profiles.id === world?.created_by ? "owner" : r.role === "admin" ? "admin" : "member") as WorldMemberRole,
    }));
}
