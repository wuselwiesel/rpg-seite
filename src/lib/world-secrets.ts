import "server-only";
import { createClient } from "@/lib/supabase/server";

export const SECRETS_NOT_ALLOWED = "In dieser Welt sind geheime Felder nicht erlaubt.";

// Sind geheime Felder in dieser Welt erlaubt? Fehlt die Angabe (oder die Spalte), gilt: ja.
export async function worldAllowsSecrets(worldId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("worlds").select("allow_secrets").eq("id", worldId).maybeSingle<{ allow_secrets: boolean | null }>();
  return data?.allow_secrets !== false;
}

export async function characterWorldAllowsSecrets(characterId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("characters").select("world_id").eq("id", characterId).maybeSingle<{ world_id: string }>();
  return data ? worldAllowsSecrets(data.world_id) : true;
}
