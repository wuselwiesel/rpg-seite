import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Friendship, Profile } from "@/lib/types";

export async function getAcceptedFriends(userId: string): Promise<Profile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("friendships")
    .select("requester_id, addressee_id, requester:requester_id(*), addressee:addressee_id(*)")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .returns<Friendship[]>();

  return (data ?? []).map((f) =>
    f.requester_id === userId ? (f.addressee as unknown as Profile) : (f.requester as unknown as Profile),
  );
}
