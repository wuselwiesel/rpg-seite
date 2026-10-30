import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { getActiveCharacter, getMentionableCharacters } from "@/lib/active-character";
import { NewPostForm } from "./new-post-form";
import { NoCharacterBanner } from "@/components/no-character-banner";

export const metadata = { title: "Neuer Beitrag" };

export default async function NewPostPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const world = await getActiveWorld(user.id);
  const character = world ? await getActiveCharacter(user.id, world.id) : null;

  // Beiträge schreibt ein Charakter: ohne Charakter erst anlegen oder eine freie Rolle anfragen
  if (world && !character) {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <h1 className="mb-3 font-serif text-3xl text-fg">Neuer Beitrag</h1>
        <NoCharacterBanner worldId={world.id} />
      </div>
    );
  }

  // Eigene Story-Beiträge dieses Charakters, mit denen ein Ingame-Beitrag verknüpft werden kann.
  const { data: storyPosts } = character
    ? await supabase
        .from("story_posts")
        .select("id, title")
        .eq("character_id", character.id)
        .order("created_at", { ascending: false })
        .limit(30)
        .returns<{ id: string; title: string }[]>()
    : { data: [] as { id: string; title: string }[] };

  const people = world ? (await getMentionableCharacters(user.id, world.id)).filter((c) => c.id !== character?.id) : [];

  return <NewPostForm storyPosts={storyPosts ?? []} people={people} />;
}
