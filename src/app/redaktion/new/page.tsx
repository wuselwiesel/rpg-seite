import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAllMentionableCharacters } from "@/lib/redaktion";
import { NewRedaktionPostForm } from "./new-redaktion-post-form";

export default async function NewRedaktionPostPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const mentionCharacters = await getAllMentionableCharacters(user.id);

  // Eigene Story-Beiträge über alle Welten hinweg, mit denen ein Redaktions-Beitrag verknüpft
  // werden kann - anders als im normalen Feed nicht auf die aktive Welt/den aktiven Charakter
  // beschränkt, weil die Redaktion welt-unabhängig ist.
  const { data: myCharacters } = await supabase.from("characters").select("id").eq("owner_id", user.id);
  const myCharacterIds = (myCharacters ?? []).map((c) => c.id);
  const { data: storyPosts } = myCharacterIds.length
    ? await supabase
        .from("story_posts")
        .select("id, title")
        .in("character_id", myCharacterIds)
        .order("created_at", { ascending: false })
        .limit(50)
        .returns<{ id: string; title: string }[]>()
    : { data: [] as { id: string; title: string }[] };

  return <NewRedaktionPostForm mentionCharacters={mentionCharacters} storyPosts={storyPosts ?? []} />;
}
