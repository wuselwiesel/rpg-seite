import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getAcceptedFriends } from "@/lib/friends";
import type { Character } from "@/lib/types";

// Eigene Charaktere + die befreundeter Accounts, über alle Welten hinweg - die Redaktion ist
// welt-unabhängig. Für @-Erwähnungen im Editor und die automatische "Charakter-Umfrage".
export const getAllMentionableCharacters = cache(async (userId: string): Promise<Character[]> => {
  const supabase = await createClient();
  const friends = await getAcceptedFriends(userId);
  const ownerIds = [userId, ...friends.map((f) => f.id)];
  const { data } = await supabase
    .from("characters")
    .select("*")
    .in("owner_id", ownerIds)
    .is("deleted_at", null)
    .order("name")
    .returns<Character[]>();
  return data ?? [];
});
