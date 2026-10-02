import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveCharacter, getMentionableCharacters, getOwnCharacters } from "@/lib/active-character";
import { getActiveWorld } from "@/lib/worlds";
import type { StoryArc } from "@/lib/types";
import { NewStoryPostForm } from "./new-story-post-form";

export default async function NewStoryPostPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const activeWorld = await getActiveWorld(user.id);
  if (!activeWorld) redirect("/worlds");

  const [{ data: arcs }, activeCharacter, mentionableCharacters, { data: locationRows }] = await Promise.all([
    supabase
      .from("story_arcs")
      .select("*")
      .eq("world_id", activeWorld.id)
      .order("name")
      .returns<StoryArc[]>(),
    getActiveCharacter(user.id, activeWorld.id),
    getMentionableCharacters(user.id, activeWorld.id),
    supabase.from("story_posts").select("location").eq("world_id", activeWorld.id).not("location", "is", null),
  ]);
  const locations = Array.from(new Set((locationRows ?? []).map((r) => r.location as string))).sort();

  const ownCharacters = await getOwnCharacters(user.id, activeWorld.id);

  return (
    <div className="mx-auto max-w-2xl xl:max-w-3xl 2xl:max-w-4xl px-4 py-10">
      <h1 className="mb-6 font-serif text-3xl text-fg">Neue Szene</h1>
      <NewStoryPostForm
        arcs={arcs ?? []}
        allCharacters={mentionableCharacters}
        ownCharacters={ownCharacters}
        activeCharacterId={activeCharacter?.id ?? null}
        locations={locations}
      />
    </div>
  );
}
