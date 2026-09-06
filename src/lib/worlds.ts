import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_WORLD_COOKIE, type World } from "@/lib/types";

export async function getUserWorlds(userId: string): Promise<World[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("world_members")
    .select("joined_at, worlds(*)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true });

  return (data ?? []).map((row) => row.worlds as unknown as World).filter(Boolean);
}

export async function getActiveWorld(userId: string): Promise<World | null> {
  const worlds = await getUserWorlds(userId);
  if (worlds.length === 0) return null;

  const cookieStore = await cookies();
  const activeId = cookieStore.get(ACTIVE_WORLD_COOKIE)?.value;

  return worlds.find((w) => w.id === activeId) ?? worlds[0];
}
