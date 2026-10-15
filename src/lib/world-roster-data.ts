import type { SupabaseClient } from "@supabase/supabase-js";
import { getWorldAdminIds } from "@/lib/npc-data";
import { getWorldChoiceLists } from "@/lib/choice-lists-data";
import { speciesLabelOf, speciesListOf } from "@/lib/world-species";
import type { RosterCharacter, RosterMember } from "@/app/story/charaktere/world-roster";

type Row = {
  id: string;
  name: string;
  avatar_url: string | null;
  owner_id: string;
  is_npc: boolean | null;
  claimable: boolean | null;
  choices: Record<string, unknown> | null;
  species: string | null;
  review_status: "pending" | "approved" | "rejected" | null;
  created_at: string;
  owner: { username: string; nickname: string | null } | null;
};

// Alle Charaktere einer Welt mit Stand (frei, vergeben, eigen, NPC) für die Übersicht
export async function loadWorldRoster(supabase: SupabaseClient, worldId: string, userId: string) {
  const [adminIds, lists, { data: rows }, { data: memberRows }, { data: claimRows }] = await Promise.all([
    getWorldAdminIds(worldId),
    getWorldChoiceLists(worldId),
    supabase
      .from("characters")
      .select("id, name, avatar_url, owner_id, is_npc, claimable, choices, species, review_status, created_at, owner:profiles!characters_owner_id_fkey(username, nickname)")
      .eq("world_id", worldId)
      .is("deleted_at", null)
      .order("name")
      .limit(2000)
      .returns<Row[]>(),
    supabase.from("world_members").select("user_id, profiles(username, nickname)").eq("world_id", worldId).returns<{ user_id: string; profiles: { username: string; nickname: string | null } | null }[]>(),
    supabase
      .from("character_claims")
      .select("id, character_id, user_id, kind")
      .eq("world_id", worldId)
      .eq("status", "pending")
      .returns<{ id: string; character_id: string; user_id: string; kind: "request" | "offer" }[]>(),
  ]);

  const isAdmin = adminIds.includes(userId);
  const speciesList = speciesListOf(lists);
  const nameOf = new Map((memberRows ?? []).map((m) => [m.user_id, m.profiles?.nickname || m.profiles?.username || "?"]));

  const characters: RosterCharacter[] = (rows ?? []).map((c) => {
    const isNpc = Boolean(c.is_npc);
    const claimable = Boolean(c.claimable);
    const status = claimable ? "free" : isNpc ? "npc" : c.review_status && c.review_status !== "approved" ? "review" : c.owner_id === userId ? "mine" : "taken";
    const offerRow = (claimRows ?? []).find((q) => q.character_id === c.id && q.kind === "offer");
    const canManage = isNpc ? isAdmin || c.owner_id === userId : c.owner_id === userId;
    return {
      id: c.id,
      name: c.name,
      avatarUrl: c.avatar_url,
      species: speciesLabelOf(c, speciesList),
      status,
      isNpc,
      reviewStatus: c.review_status ?? "approved",
      claimable,
      ownerName: c.owner ? c.owner.nickname || c.owner.username : null,
      createdAt: c.created_at,
      canManage,
      myRequestId: (claimRows ?? []).find((q) => q.character_id === c.id && q.kind === "request" && q.user_id === userId)?.id ?? null,
      offer: offerRow ? { claimId: offerRow.id, toName: nameOf.get(offerRow.user_id) ?? "?" } : null,
      requestCount: canManage ? (claimRows ?? []).filter((q) => q.character_id === c.id && q.kind === "request").length : 0,
    };
  });

  const playerOwners = new Set((rows ?? []).filter((c) => !c.is_npc).map((c) => c.owner_id));
  const members: RosterMember[] = (memberRows ?? []).map((m) => ({
    id: m.user_id,
    name: m.profiles?.nickname || m.profiles?.username || "?",
    hasCharacter: playerOwners.has(m.user_id),
  }));
  const offerTargets = members.filter((m) => m.id !== userId).map((m) => ({ id: m.id, name: m.name }));

  return { characters, members, offerTargets, isAdmin };
}
