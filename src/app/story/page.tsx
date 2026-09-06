import Link from "next/link";
import { PenLine } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveCharacter } from "@/lib/active-character";
import { getActiveWorld } from "@/lib/worlds";
import { EntryCard } from "@/components/entry-card";
import { CharacterAvatar } from "@/components/character-avatar";
import type { StoryPost } from "@/lib/types";

export default async function StoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const activeWorld = await getActiveWorld(user.id);
  if (!activeWorld) redirect("/worlds");

  const activeCharacter = await getActiveCharacter(user.id, activeWorld.id);
  if (!activeCharacter) redirect("/characters/new");

  const { data: storyPosts } = await supabase
    .from("story_posts")
    .select("*, characters(*), story_entries(count)")
    .eq("world_id", activeWorld.id)
    .order("created_at", { ascending: false })
    .returns<StoryPost[]>();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-1 flex items-center gap-2">
        <PenLine className="h-6 w-6 text-accent" strokeWidth={2} />
        <h1 className="font-serif text-3xl text-fg">Story</h1>
      </div>
      <p className="mb-6 text-sm text-muted">Die Handlungsstränge von {activeWorld.name}.</p>

      <Link
        href="/story/new"
        className="mb-6 flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 transition hover:bg-surface-2"
      >
        <CharacterAvatar
          name={activeCharacter.name}
          avatarUrl={activeCharacter.avatar_url}
          size={36}
        />
        <span className="text-sm text-muted">
          Beginn eine neue Szene als {activeCharacter.name}...
        </span>
      </Link>

      <div className="flex flex-col gap-4">
        {storyPosts?.length ? (
          storyPosts.map((post, index) => (
            <EntryCard
              key={post.id}
              id={post.id}
              title={post.title}
              content={post.content}
              createdAt={post.created_at}
              character={post.characters}
              characterHref={`/characters/${post.character_id}`}
              detailHref={`/story/${post.id}`}
              replyCount={post.story_entries?.[0]?.count ?? 0}
              replyLabel="Fortsetzungen"
              replyCta="Weiterschreiben"
              index={index}
            />
          ))
        ) : (
          <p className="text-muted">
            Noch keine Szene begonnen.{" "}
            <Link href="/story/new" className="text-accent hover:underline">
              Schreib die erste.
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
