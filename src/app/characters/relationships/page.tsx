import { redirect } from "next/navigation";
import { Network } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import type { Character, CharacterRelationship } from "@/lib/types";
import { RelationshipGraph } from "./relationship-graph";
import { RelationshipForm } from "./relationship-form";
import { RelationshipList } from "./relationship-list";

export default async function RelationshipsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const activeWorld = await getActiveWorld(user.id);
  if (!activeWorld) redirect("/worlds");

  const [{ data: characters }, { data: relationships }, { data: worldRow }] = await Promise.all([
    supabase
      .from("characters")
      .select("*")
      .eq("world_id", activeWorld.id)
      .order("name")
      .returns<Character[]>(),
    supabase
      .from("character_relationships")
      .select("*")
      .eq("world_id", activeWorld.id)
      .returns<CharacterRelationship[]>(),
    supabase.from("worlds").select("created_by").eq("id", activeWorld.id).maybeSingle(),
  ]);

  const isWorldOwner = worldRow?.created_by === user.id;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-1 flex items-center gap-2">
        <Network className="h-6 w-6 text-accent" strokeWidth={2} />
        <h1 className="font-serif text-3xl text-fg">Beziehungsnetz</h1>
      </div>
      <p className="mb-6 text-sm text-muted">Wer steht wie zueinander in {activeWorld.name}.</p>

      <div className="mb-8 rounded-2xl bg-surface-2 p-6">
        <RelationshipGraph characters={characters ?? []} relationships={relationships ?? []} />
      </div>

      <h2 className="mb-3 font-serif text-lg text-fg">Neue Beziehung</h2>
      <div className="mb-8">
        <RelationshipForm characters={characters ?? []} />
      </div>

      <h2 className="mb-3 font-serif text-lg text-fg">Alle Beziehungen</h2>
      <RelationshipList
        relationships={relationships ?? []}
        characters={characters ?? []}
        currentUserId={user.id}
        isWorldOwner={isWorldOwner}
      />
    </div>
  );
}
