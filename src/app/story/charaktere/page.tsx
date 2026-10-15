import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { getWorldAdminIds } from "@/lib/npc-data";
import { getWorldChoiceLists } from "@/lib/choice-lists-data";
import { speciesLabelOf, speciesListOf } from "@/lib/world-species";
import { StorySections } from "@/components/story-sections";
import { WorldRoster, type RosterCharacter, type RosterMember } from "./world-roster";

export const metadata = { title: "Charaktere der Welt" };

type Row = {
  id: string;
  name: string;
  avatar_url: string | null;
  owner_id: string;
  is_npc: boolean | null;
  claimable: boolean | null;
  choices: Record<string, unknown> | null;
  species: string | null;
  created_at: string;
  owner: { username: string; nickname: string | null } | null;
};

// Alle Charaktere der Welt auf einen Blick: wer spielt wen, was ist frei, was ist ein NPC
export default async function WorldCharactersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const world = await getActiveWorld(user.id);
  if (!world) redirect("/worlds");

  const [adminIds, lists, { data: rows }, { data: memberRows }, { data: claimRows }] = await Promise.all([
    getWorldAdminIds(world.id),
    getWorldChoiceLists(world.id),
    supabase
      .from("characters")
      .select("id, name, avatar_url, owner_id, is_npc, claimable, choices, species, created_at, owner:profiles!characters_owner_id_fkey(username, nickname)")
      .eq("world_id", world.id)
      .is("deleted_at", null)
      .order("name")
      .limit(2000)
      .returns<Row[]>(),
    supabase.from("world_members").select("user_id, profiles(username, nickname)").eq("world_id", world.id).returns<{ user_id: string; profiles: { username: string; nickname: string | null } | null }[]>(),
    supabase
      .from("character_claims")
      .select("id, character_id, user_id, kind")
      .eq("world_id", world.id)
      .eq("status", "pending")
      .returns<{ id: string; character_id: string; user_id: string; kind: "request" | "offer" }[]>(),
  ]);

  const isAdmin = adminIds.includes(user.id);
  const speciesList = speciesListOf(lists);
  const nameOf = new Map((memberRows ?? []).map((m) => [m.user_id, m.profiles?.nickname || m.profiles?.username || "?"]));

  const characters: RosterCharacter[] = (rows ?? []).map((c) => {
    const isNpc = Boolean(c.is_npc);
    const claimable = Boolean(c.claimable);
    const status = claimable ? "free" : isNpc ? "npc" : c.owner_id === user.id ? "mine" : "taken";
    const offerRow = (claimRows ?? []).find((q) => q.character_id === c.id && q.kind === "offer");
    const canManage = isNpc ? isAdmin || c.owner_id === user.id : c.owner_id === user.id;
    return {
      id: c.id,
      name: c.name,
      avatarUrl: c.avatar_url,
      species: speciesLabelOf(c, speciesList),
      status,
      isNpc,
      claimable,
      ownerName: c.owner ? c.owner.nickname || c.owner.username : null,
      createdAt: c.created_at,
      canManage,
      myRequestId: (claimRows ?? []).find((q) => q.character_id === c.id && q.kind === "request" && q.user_id === user.id)?.id ?? null,
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
  const offerTargets = members.filter((m) => m.id !== user.id).map((m) => ({ id: m.id, name: m.name }));

  return (
    <div className="mx-auto max-w-2xl xl:max-w-3xl 2xl:max-w-4xl px-4 py-6 sm:py-10">
      <div className="mb-4 flex items-baseline gap-2">
        <h1 className="font-serif text-3xl text-fg">Story</h1>
        <p className="truncate text-sm text-muted">{world.name}</p>
      </div>
      <StorySections current="charaktere" />
      <WorldRoster characters={characters} members={members} offerTargets={offerTargets} isAdmin={isAdmin} />
    </div>
  );
}
