import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveCharacter } from "@/lib/active-character";
import { getActiveWorld } from "@/lib/worlds";
import { CharacterAvatar } from "@/components/character-avatar";
import { FollowButton } from "@/components/follow-button";
import type { Character } from "@/lib/types";

export default async function FollowsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const showFollowing = tab === "following";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: character } = await supabase
    .from("characters")
    .select("id, name, username, world_id")
    .eq("id", id)
    .maybeSingle<Pick<Character, "id" | "name" | "username" | "world_id">>();
  if (!character) notFound();

  const [{ data: followerRows }, { data: followingRows }] = await Promise.all([
    supabase.from("character_follows").select("follower_id").eq("followed_id", id),
    supabase.from("character_follows").select("followed_id").eq("follower_id", id),
  ]);
  const followerIds = (followerRows ?? []).map((r) => r.follower_id as string);
  const followingIds = (followingRows ?? []).map((r) => r.followed_id as string);
  const listedIds = showFollowing ? followingIds : followerIds;

  const { data: listed } = listedIds.length
    ? await supabase
        .from("characters")
        .select("id, name, username, avatar_url, world_id")
        .in("id", listedIds)
        .order("name")
        .returns<Pick<Character, "id" | "name" | "username" | "avatar_url" | "world_id">[]>()
    : { data: [] };

  const activeWorld = await getActiveWorld(user.id);
  const activeCharacter = activeWorld ? await getActiveCharacter(user.id, activeWorld.id) : null;
  const { data: myFollows } = activeCharacter
    ? await supabase.from("character_follows").select("followed_id").eq("follower_id", activeCharacter.id)
    : { data: [] };
  const myFollowing = new Set((myFollows ?? []).map((r) => r.followed_id as string));

  const tabClass = (active: boolean) =>
    `flex-1 border-b-2 px-4 py-3 text-center text-sm font-semibold transition ${
      active ? "border-fg text-fg" : "border-transparent text-muted hover:text-fg-soft"
    }`;

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <Link
        href={`/characters/${id}`}
        className="mb-3 flex items-center gap-1 text-sm text-muted transition hover:text-fg"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        {character.username ?? character.name}
      </Link>

      <div className="flex border-b border-line">
        <Link href={`/characters/${id}/follows?tab=followers`} className={tabClass(!showFollowing)}>
          {followerIds.length} Follower
        </Link>
        <Link href={`/characters/${id}/follows?tab=following`} className={tabClass(showFollowing)}>
          {followingIds.length} Gefolgt
        </Link>
      </div>

      <ul className="mt-2 flex flex-col">
        {listed?.length ? (
          listed.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-1 py-2.5">
              <Link href={`/characters/${c.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <CharacterAvatar name={c.name} avatarUrl={c.avatar_url} size={44} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-fg">{c.username ?? c.name}</p>
                  {c.username && <p className="truncate text-sm text-muted">{c.name}</p>}
                </div>
              </Link>
              {activeCharacter && c.id !== activeCharacter.id && c.world_id === activeCharacter.world_id && (
                <div className="w-28 shrink-0">
                  <FollowButton
                    followerId={activeCharacter.id}
                    followedId={c.id}
                    initialFollowing={myFollowing.has(c.id)}
                  />
                </div>
              )}
            </li>
          ))
        ) : (
          <li className="py-16 text-center text-muted">
            {showFollowing ? "Folgt noch niemandem." : "Noch keine Follower."}
          </li>
        )}
      </ul>
    </div>
  );
}
