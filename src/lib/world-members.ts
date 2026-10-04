import { createClient } from "@/lib/supabase/server";

export type WorldMember = { id: string; name: string; avatarUrl: string | null };

// Alle Accounts, die in der Welt mitspielen (für die Online-Anzeige in der Story).
export async function getWorldMembers(worldId: string): Promise<WorldMember[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("world_members")
    .select("profiles(id, username, nickname, avatar_url)")
    .eq("world_id", worldId)
    .returns<{ profiles: { id: string; username: string; nickname: string | null; avatar_url: string | null } | null }[]>();
  return (data ?? [])
    .map((r) => r.profiles)
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => ({ id: p.id, name: p.nickname || p.username, avatarUrl: p.avatar_url }));
}
