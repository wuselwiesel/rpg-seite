import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  const { data: arcs } = await supabase
    .from("story_arcs")
    .select("*")
    .eq("world_id", activeWorld.id)
    .order("name")
    .returns<StoryArc[]>();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 font-serif text-3xl text-fg">Neue Szene</h1>
      <NewStoryPostForm arcs={arcs ?? []} />
    </div>
  );
}
