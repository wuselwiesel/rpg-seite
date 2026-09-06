import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_CHARACTER_COOKIE, type Character } from "@/lib/types";

export async function getOwnCharacters(userId: string, worldId: string): Promise<Character[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("characters")
    .select("*")
    .eq("owner_id", userId)
    .eq("world_id", worldId)
    .order("created_at", { ascending: true });

  return data ?? [];
}

export async function getActiveCharacter(userId: string, worldId: string): Promise<Character | null> {
  const characters = await getOwnCharacters(userId, worldId);
  if (characters.length === 0) return null;

  const cookieStore = await cookies();
  const activeId = cookieStore.get(ACTIVE_CHARACTER_COOKIE)?.value;

  return characters.find((c) => c.id === activeId) ?? characters[0];
}
