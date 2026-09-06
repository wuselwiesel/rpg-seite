import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CharacterAvatar } from "@/components/character-avatar";
import { PostCard } from "@/components/post-card";
import type { Character, Post } from "@/lib/types";

export default async function CharacterProfilePage({
  params,
}: PageProps<"/characters/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: character } = await supabase
    .from("characters")
    .select("*")
    .eq("id", id)
    .maybeSingle<Character>();

  if (!character) notFound();

  const { data: posts } = await supabase
    .from("posts")
    .select("*, characters(*)")
    .eq("character_id", id)
    .order("created_at", { ascending: false })
    .returns<Post[]>();

  const isOwn = character.owner_id === user.id;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 flex items-center gap-4">
        <CharacterAvatar name={character.name} avatarUrl={character.avatar_url} size={72} />
        <div className="flex-1">
          <h1 className="font-serif text-3xl text-fg">{character.name}</h1>
          {character.bio && (
            <p className="mt-1 whitespace-pre-line text-sm text-muted">{character.bio}</p>
          )}
        </div>
        {isOwn && (
          <Link
            href={`/characters/${character.id}/edit`}
            className="rounded-md border border-line px-3 py-1.5 text-sm text-fg-soft transition hover:border-accent hover:text-accent"
          >
            Bearbeiten
          </Link>
        )}
      </div>

      <h2 className="mb-4 font-serif text-xl text-fg">Einträge</h2>
      <div className="flex flex-col gap-4">
        {posts?.length ? (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <p className="text-muted">Noch keine Einträge von {character.name}.</p>
        )}
      </div>
    </div>
  );
}
