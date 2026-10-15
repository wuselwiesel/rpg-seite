import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getWorldChoiceLists } from "@/lib/choice-lists-data";
import { speciesLabelOf, speciesListOf } from "@/lib/world-species";
import type { OfferForMe, RoleCard } from "@/app/worlds/[id]/roles-panel";

type ClaimRow = {
  id: string;
  character_id: string;
  user_id: string;
  kind: "request" | "offer";
  message: string;
  created_by: string | null;
  requester: { username: string; nickname: string | null } | null;
  creator: { username: string; nickname: string | null } | null;
};

type CharRow = { id: string; name: string; avatar_url: string | null; bio: string | null; choices: Record<string, unknown> | null; species: string | null; claimable: boolean };

const name = (p: { username: string; nickname: string | null } | null | undefined) => p?.nickname || p?.username || "Jemand";

// Freie Rollen einer Welt samt offenen Anfragen/Angeboten und den Angeboten an die angemeldete Person
export async function getWorldRoles(worldId: string, userId: string, memberNames: Map<string, string>): Promise<{ roles: RoleCard[]; offersForMe: OfferForMe[] }> {
  const supabase = await createClient();
  const [{ data: claims }, lists] = await Promise.all([
    supabase
      .from("character_claims")
      .select(
        "id, character_id, user_id, kind, message, created_by, requester:profiles!character_claims_user_id_fkey(username, nickname), creator:profiles!character_claims_created_by_fkey(username, nickname)",
      )
      .eq("world_id", worldId)
      .eq("status", "pending")
      .returns<ClaimRow[]>(),
    getWorldChoiceLists(worldId),
  ]);
  const claimRows = claims ?? [];
  const speciesList = speciesListOf(lists);

  const offerRows = claimRows.filter((c) => c.kind === "offer" && c.user_id === userId);
  const ids = [...new Set(offerRows.map((c) => c.character_id))];
  const [{ data: claimable }, { data: offered }] = await Promise.all([
    supabase
      .from("characters")
      .select("id, name, avatar_url, bio, choices, species, claimable")
      .eq("world_id", worldId)
      .eq("is_npc", true)
      .eq("claimable", true)
      .is("deleted_at", null)
      .order("name")
      .returns<CharRow[]>(),
    ids.length > 0
      ? supabase.from("characters").select("id, name, avatar_url, bio, choices, species, claimable").in("id", ids).returns<CharRow[]>()
      : Promise.resolve({ data: [] as CharRow[] }),
  ]);

  const roles: RoleCard[] = (claimable ?? []).map((c) => {
    const mine = claimRows.find((q) => q.character_id === c.id && q.kind === "request" && q.user_id === userId);
    const offer = claimRows.find((q) => q.character_id === c.id && q.kind === "offer");
    return {
      id: c.id,
      name: c.name,
      avatarUrl: c.avatar_url,
      bio: c.bio,
      species: speciesLabelOf(c, speciesList),
      myRequestId: mine?.id ?? null,
      offer: offer ? { claimId: offer.id, toName: memberNames.get(offer.user_id) ?? name(offer.requester) } : null,
      // Anfragen sieht nur, wer sie lesen darf (Admins); für andere liefert die Datenbank nur die eigenen
      requests: claimRows
        .filter((q) => q.character_id === c.id && q.kind === "request" && q.user_id !== userId)
        .map((q) => ({ claimId: q.id, fromName: name(q.requester), message: q.message })),
    };
  });

  const byId = new Map((offered ?? []).map((c) => [c.id, c]));
  const offersForMe: OfferForMe[] = offerRows
    .map((o) => {
      const c = byId.get(o.character_id);
      return c ? { claimId: o.id, characterId: c.id, characterName: c.name, avatarUrl: c.avatar_url, fromName: name(o.creator), message: o.message } : null;
    })
    .filter((x): x is OfferForMe => x !== null);

  return { roles, offersForMe };
}
