import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Grid3x3, MessageCircle, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { getActiveCharacter } from "@/lib/active-character";
import { FollowButton } from "@/components/follow-button";
import { CharacterAvatar } from "@/components/character-avatar";
import { profileThemeStyle } from "@/lib/profile-theme";
import { firstImageSrc, stripHtml } from "@/lib/strip-html";
import { CharacterSheetEmbed } from "@/components/character-sheet-embed";
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
  const otherOwn = (myCharacters ?? []).filter((c) => c.id !== id && c.world_id === character.world_id);
  const canMessage = !isOwn && activeWorld?.id === character.world_id;

  const themeStyle = profileThemeStyle({
    font: character.theme_font,
    accent: character.theme_accent,
    bg: character.theme_bg,
  });
  const buttonBase = "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-1.5 text-sm font-semibold transition";

  return (
    <div style={themeStyle} className="min-h-full bg-app text-fg">
      <div className="mx-auto max-w-[935px] px-4 pt-6 sm:pt-10">
        <header className="flex gap-5 sm:gap-20">
          <div className="shrink-0 sm:px-6">
            <div className="rounded-full bg-gradient-to-tr from-accent to-accent-strong p-[3px]">
              <div className="rounded-full bg-app p-[3px]">
                <div className="h-[80px] w-[80px] overflow-hidden rounded-full bg-surface-2 sm:h-[150px] sm:w-[150px]">
                  {character.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={character.avatar_url} alt={character.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl font-semibold sm:text-6xl">
                      {character.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <h1 className="truncate text-xl font-normal text-fg">
                {character.username ?? (isOwn ? "kein.nutzername" : character.name)}
              </h1>
              <div className="hidden w-full gap-2 sm:flex sm:w-auto">
                {isOwn ? (
                  <Link href={`/characters/${character.id}/edit`} className={`${buttonBase} bg-surface-2 text-fg hover:bg-surface-3`}>
                    <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                    Profil bearbeiten
                  </Link>
                ) : (
                  <>
                    {activeCharacter && activeWorld?.id === character.world_id && (
                      <FollowButton followerId={activeCharacter.id} followedId={character.id} initialFollowing={Boolean(followRow)} />
                    )}
                    {canMessage && (
                      <Link href={`/chats/new?with=${character.id}`} className={`${buttonBase} bg-surface-2 text-fg hover:bg-surface-3`}>
                        <MessageCircle className="h-3.5 w-3.5" strokeWidth={2} />
                        Nachricht
                      </Link>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="mt-4 hidden gap-8 text-base sm:flex">
              <span><b className="font-semibold">{posts?.length ?? 0}</b> {posts?.length === 1 ? "Beitrag" : "Beiträge"}</span>
              <span><b className="font-semibold">{followerCount ?? 0}</b> Follower</span>
              <span><b className="font-semibold">{followingCount ?? 0}</b> Gefolgt</span>
            </div>

            <div className="mt-4 hidden text-sm sm:block">
              <p className="font-semibold">{character.name}</p>
              {character.worlds?.name && <p className="text-muted">in {character.worlds.name}</p>}
              {character.bio && <p className="mt-1 whitespace-pre-line">{character.bio}</p>}
            </div>
          </div>
        </header>

        <div className="mt-4 text-sm sm:hidden">
          <p className="font-semibold">{character.name}</p>
          {character.username && <p className="text-muted">@{character.username}</p>}
          {character.worlds?.name && <p className="text-muted">in {character.worlds.name}</p>}
          {character.bio && <p className="mt-1 whitespace-pre-line">{character.bio}</p>}
        </div>

        <div className="mt-4 flex gap-2 sm:hidden">
          {isOwn ? (
            <Link href={`/characters/${character.id}/edit`} className={`${buttonBase} bg-surface-2 text-fg hover:bg-surface-3`}>
              Profil bearbeiten
            </Link>
          ) : (
            <>
              {activeCharacter && activeWorld?.id === character.world_id && (
                <FollowButton followerId={activeCharacter.id} followedId={character.id} initialFollowing={Boolean(followRow)} />
              )}
              {canMessage && (
                <Link href={`/chats/new?with=${character.id}`} className={`${buttonBase} bg-surface-2 text-fg hover:bg-surface-3`}>
                  Nachricht
                </Link>
              )}
            </>
          )}
        </div>

        <div className="mt-4 flex justify-around border-t border-line text-center text-sm sm:hidden">
          <div className="py-2"><b className="block font-semibold">{posts?.length ?? 0}</b><span className="text-muted">{posts?.length === 1 ? "Beitrag" : "Beiträge"}</span></div>
          <div className="py-2"><b className="block font-semibold">{followerCount ?? 0}</b><span className="text-muted">Follower</span></div>
          <div className="py-2"><b className="block font-semibold">{followingCount ?? 0}</b><span className="text-muted">Gefolgt</span></div>
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

        <div className="mt-6 flex justify-center border-t border-line">
          <span className="-mt-px flex items-center gap-1.5 border-t border-fg px-4 py-3 text-xs font-semibold uppercase tracking-widest text-fg">
            <Grid3x3 className="h-3.5 w-3.5" strokeWidth={2} />
            Beiträge
          </span>
        </div>

        {posts?.length ? (
          <div className="grid grid-cols-3 gap-[3px] pb-24 sm:gap-1 lg:pb-10">
            {posts.map((post) => {
              const image = firstImageSrc(post.content);
              const replies = post.comments?.[0]?.count ?? 0;
              return (
                <Link
                  key={post.id}
                  href={`/posts/${post.id}`}
                  className="group relative block aspect-square overflow-hidden bg-surface-2"
                >
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt={post.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full flex-col justify-center gap-1 overflow-hidden bg-surface-3 p-2 sm:p-4">
                      <p className="line-clamp-3 font-serif text-sm leading-tight text-fg sm:text-xl">{post.title}</p>
                      <p className="line-clamp-3 hidden text-xs text-fg-soft sm:block">{stripHtml(post.content)}</p>
                    </div>
                  )}
                  <div className="absolute inset-0 hidden items-center justify-center gap-4 bg-black/40 text-sm font-semibold text-white opacity-0 transition group-hover:opacity-100 sm:flex">
                    <span className="flex items-center gap-1.5">
                      <MessageCircle className="h-5 w-5 fill-white" strokeWidth={0} />
                      {replies}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="py-16 text-center text-muted">Noch keine Beiträge.</p>
        )}
      </div>
    </div>
  );
}
