import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MessageCircle, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { getActiveCharacter } from "@/lib/active-character";
import { FollowButton } from "@/components/follow-button";
import { CharacterAvatar } from "@/components/character-avatar";
import { CharacterSheetEmbed } from "@/components/character-sheet-embed";
import { SocialPostCard } from "@/components/social-post-card";
import { ReactionBar } from "@/components/reaction-bar";
import { aggregateReactions } from "@/lib/reactions";
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
    .select("*, worlds(name)")
    .eq("id", id)
    .maybeSingle<Character>();

  if (!character) notFound();

  const [{ data: posts }, { data: myCharacters }, activeWorld] = await Promise.all([
    supabase
      .from("posts")
      .select("*, characters(*), comments(count), reactions(emoji, character_id)")
      .eq("character_id", id)
      .order("created_at", { ascending: false })
      .returns<Post[]>(),
    supabase.from("characters").select("id, name, avatar_url, world_id").eq("owner_id", user.id),
    getActiveWorld(user.id),
  ]);

  const activeCharacter = activeWorld ? await getActiveCharacter(user.id, activeWorld.id) : null;

  // Follow-Tabelle kann fehlen, solange die Migration nicht eingespielt ist: Fehler = 0 / nicht gefolgt.
  const [{ count: followerCount }, { count: followingCount }, { data: followRow }] = await Promise.all([
    supabase.from("character_follows").select("*", { count: "exact", head: true }).eq("followed_id", id),
    supabase.from("character_follows").select("*", { count: "exact", head: true }).eq("follower_id", id),
    activeCharacter
      ? supabase
          .from("character_follows")
          .select("followed_id")
          .eq("follower_id", activeCharacter.id)
          .eq("followed_id", id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const isOwn = character.owner_id === user.id;
  const myCharacterIds = new Set((myCharacters ?? []).map((c) => c.id));
  const otherOwn = (myCharacters ?? []).filter((c) => c.id !== id && c.world_id === character.world_id);
  const canMessage = !isOwn && activeWorld?.id === character.world_id;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center gap-5 sm:gap-8">
        <div className="rounded-full bg-gradient-to-tr from-accent to-accent-strong p-[3px]">
          <div className="rounded-full bg-app p-[3px]">
            <CharacterAvatar name={character.name} avatarUrl={character.avatar_url} size={96} />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-serif text-3xl text-fg">{character.name}</h1>
          <p className="truncate text-sm text-muted">
            {character.username ? `@${character.username}` : isOwn ? "Noch kein Nutzername" : null}
            {character.worlds?.name && <span>{character.username || isOwn ? " · " : ""}in {character.worlds.name}</span>}
          </p>
          <div className="mt-2 flex gap-5 text-xs text-fg-soft">
            <span className="flex flex-col"><span className="text-base font-semibold text-fg">{posts?.length ?? 0}</span>{posts?.length === 1 ? "Beitrag" : "Beiträge"}</span>
            <span className="flex flex-col"><span className="text-base font-semibold text-fg">{followerCount ?? 0}</span>Follower</span>
            <span className="flex flex-col"><span className="text-base font-semibold text-fg">{followingCount ?? 0}</span>Folge ich</span>
          </div>
        </div>
      </div>

      {character.bio && <p className="mt-4 whitespace-pre-line text-sm text-fg-soft">{character.bio}</p>}

      <div className="mt-4 flex gap-2">
        {isOwn ? (
          <Link
            href={`/characters/${character.id}/edit`}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-surface-2 px-4 py-2 text-sm font-medium text-fg transition hover:bg-surface-3"
          >
            <Pencil className="h-4 w-4" strokeWidth={2} />
            Profil bearbeiten
          </Link>
        ) : (
          <>
            {activeCharacter && activeWorld?.id === character.world_id && (
              <FollowButton
                followerId={activeCharacter.id}
                followedId={character.id}
                initialFollowing={Boolean(followRow)}
              />
            )}
            {canMessage && (
            <Link
              href={`/chats/new?with=${character.id}`}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-surface-2 px-4 py-2 text-sm font-medium text-fg transition hover:bg-surface-3"
            >
              <MessageCircle className="h-4 w-4" strokeWidth={2} />
              Nachricht
            </Link>
            )}
          </>
        )}
      </div>

      {isOwn && otherOwn.length > 0 && (
        <div className="mt-5 flex gap-4 overflow-x-auto">
          {otherOwn.map((c) => (
            <Link key={c.id} href={`/characters/${c.id}`} className="flex w-16 shrink-0 flex-col items-center gap-1" title={c.name}>
              <CharacterAvatar name={c.name} avatarUrl={c.avatar_url} size={48} />
              <span className="w-full truncate text-center text-xs text-fg-soft">{c.name.split(" ")[0]}</span>
            </Link>
          ))}
        </div>
      )}

      {character.sheet_url && (
        <div className="mt-6">
          <CharacterSheetEmbed sheetUrl={character.sheet_url} />
        </div>
      )}

      <div className="mt-6 border-t border-line pt-6">
        <div className="flex flex-col gap-4">
          {posts?.length ? (
            posts.map((post) => (
              <SocialPostCard
                key={post.id}
                title={post.title}
                content={post.content}
                createdAt={post.created_at}
                character={post.characters}
                characterHref={`/characters/${post.character_id}`}
                detailHref={`/posts/${post.id}`}
                replyCount={post.comments?.[0]?.count ?? 0}
                reactionBar={
                  <ReactionBar
                    target={{ postId: post.id }}
                    initialReactions={aggregateReactions(post.reactions, myCharacterIds)}
                  />
                }
                tags={post.tags}
                tagHrefBase="/"
              />
            ))
          ) : (
            <p className="text-center text-muted">Noch keine Beiträge von {character.name}.</p>
          )}
        </div>
      </div>
    </div>
  );
}
