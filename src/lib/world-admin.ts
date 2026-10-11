import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { World } from "@/lib/types";

// Besitzer:in oder Admin der Welt (wie die Regel, die auch die Datenbank beim Ändern der Welt anwendet)
export async function getWorldAdminFlag(userId: string, world: Pick<World, "id" | "created_by">): Promise<boolean> {
  if (world.created_by === userId) return true;
  const supabase = await createClient();
  const { data } = await supabase.from("world_members").select("role").eq("world_id", world.id).eq("user_id", userId).maybeSingle<{ role: string }>();
  return data?.role === "admin";
}
