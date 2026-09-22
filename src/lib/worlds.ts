import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_WORLD_COOKIE, type World } from "@/lib/types";

// cache() dedupliziert mehrfache Aufrufe innerhalb eines Requests (z.B. einmal
// aus der Sidebar, einmal aus der jeweiligen Seite) zu einer einzigen Abfrage.
export const getUserWorlds = cache(async (userId: string): Promise<World[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("world_members")
    .select("joined_at, worlds(*)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true });

  return (data ?? []).map((row) => row.worlds as unknown as World).filter(Boolean);
});

export const getActiveWorld = cache(async (userId: string): Promise<World | null> => {
  const worlds = await getUserWorlds(userId);
  if (worlds.length === 0) return null;

  const cookieStore = await cookies();
  const activeId = cookieStore.get(ACTIVE_WORLD_COOKIE)?.value;

  return worlds.find((w) => w.id === activeId) ?? worlds[0];
});

// Für die Kurzanleitung ("Wie funktioniert das hier?"): wann ist die Person dieser Welt beigetreten?
export const getWorldJoinedAt = cache(async (userId: string, worldId: string): Promise<string | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("world_members")
    .select("joined_at")
    .eq("user_id", userId)
    .eq("world_id", worldId)
    .maybeSingle();
  return data?.joined_at ?? null;
});
