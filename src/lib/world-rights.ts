import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { FULL_RIGHTS, parsePermissions, resolveRights, type WorldRights } from "@/lib/world-permissions";

// Was darf die angemeldete Person in dieser Welt? (Rechte-Tabelle der Welt; Admins dürfen immer alles)
export const getWorldRights = cache(async (worldId: string, userId: string): Promise<WorldRights> => {
  const supabase = await createClient();
  const [{ data: world }, { data: member }] = await Promise.all([
    supabase.from("worlds").select("created_by, permissions").eq("id", worldId).maybeSingle<{ created_by: string; permissions: unknown }>(),
    supabase.from("world_members").select("role").eq("world_id", worldId).eq("user_id", userId).maybeSingle<{ role: string }>(),
  ]);
  if (!world) return FULL_RIGHTS;
  const isAdmin = world.created_by === userId || member?.role === "admin";
  return resolveRights(parsePermissions(world.permissions), isAdmin);
});
