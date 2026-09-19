import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronDown, Grid3x3, MessageCircle, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { getActiveCharacter } from "@/lib/active-character";
import { FollowButton } from "@/components/follow-button";
import { ProfileThemeWrapper } from "@/components/profile-theme-wrapper";
import { firstImageSrc, stripHtml } from "@/lib/strip-html";
import { CharacterSheetEmbed } from "@/components/character-sheet-embed";
import { storyBackground } from "@/lib/stories";
import { PostMedia } from "@/components/post-media";
import { StoryLauncher, type StoryGroup } from "@/components/story-viewer";
import { Plus } from "lucide-react";
import type { Character, Highlight, Post, Story } from "@/lib/types";

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

  const [{ data: posts }, activeWorld] = await Promise.all([
    supabase
      .from("posts")
      .select("*, characters(*), comments(count), reactions(emoji, character_id)")
      .eq("character_id", id)
      .order("created_at", { ascending: false })
      .returns<Post[]>(),
    getActiveWorld(user.id),
  ]);

  const activeCharacter = activeWorld ? await getActiveCharacter(user.id, activeWorld.id) : null;

  const [{ data: activeStories }, { data: highlightRows }] = await Promise.all([
    supabase
      .from("stories")
      .select("*")
      .eq("character_id", id)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true })
      .returns<Story[]>(),
    supabase
      .from("highlights")
      .select("*, highlight_stories(position, stories(*))")
      .eq("character_id", id)
      .order("created_at", { ascending: true })
      .returns<Highlight[]>(),
  ]);

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
  const isActiveProfile = activeCharacter?.id === character.id;
  const canMessage = !isActiveProfile && activeWorld?.id === character.world_id;

  const baseGroup = {
    characterId: character.id,
    characterName: character.name,
    avatarUrl: character.avatar_url,
    canManage: isOwn,
  };
  const storyGroups: StoryGroup[] = activeStories?.length
    ? [{ ...baseGroup, key: "active", stories: activeStories }]
    : [];
  const highlightGroups: StoryGroup[] = (highlightRows ?? [])
    .map((h) => ({
      ...baseGroup,
      key: h.id,
      highlightId: h.id,
      label: h.title,
      stories: (h.highlight_stories ?? [])
        .sort((a, b) => a.position - b.position)
        .map((hs) => hs.stories)
        .filter((s): s is Story => Boolean(s)),
    }))
    .filter((g) => g.stories.length > 0);

  const buttonBase = "flex flex-1 whitespace-nowrap items-center justify-center gap-2 rounded-lg px-4 py-1.5 text-sm font-semibold transition";

  return (
    <ProfileThemeWrapper
      theme={{ font: character.theme_font, accent: character.theme_accent, bg: character.theme_bg }}
    >
      <div className="mx-auto max-w-[935px] px-4 pt-6 sm:pt-10">
        <header className="flex gap-5 sm:gap-20">
          <div className="shrink-0 sm:px-6">
            {(() => {
              const avatar = (
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
              );
              return (
                <div className="relative">
                  {storyGroups.length > 0 ? (
                    <StoryLauncher groups={storyGroups} ringWidth={3} label="Story ansehen">
                      {avatar}
                    </StoryLauncher>
                  ) : (
                    <div className="rounded-full p-[3px]">
                      <div className="rounded-full bg-app p-[3px]">{avatar}</div>
                    </div>
                  )}
                  {isActiveProfile && (
                    <Link
                      href="/stories/new"
                      aria-label="Neue Story erstellen"
                      className="absolute bottom-0.5 right-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-app bg-accent-strong text-on-accent-strong sm:bottom-2 sm:right-2 sm:h-8 sm:w-8"
                    >
                      <Plus className="h-4 w-4" strokeWidth={3} />
                    </Link>
                  )}
                </div>
              );
            })()}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <h1 className="truncate text-xl font-normal text-fg">
                {character.username ?? (isOwn ? "kein.nutzername" : character.name)}
              </h1>
              <div className="hidden w-full gap-2 sm:flex sm:w-auto">
                {isActiveProfile ? (
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
                    {isOwn && (
                      <Link href={`/characters/${character.id}/edit`} aria-label="Bearbeiten" className={`${buttonBase} flex-none bg-surface-2 text-fg hover:bg-surface-3`}>
                        <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                      </Link>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="mt-3 flex justify-between gap-2 text-center text-sm sm:mt-4 sm:justify-start sm:gap-8 sm:text-left sm:text-base">
              <span className="flex flex-col sm:block"><b className="font-semibold">{posts?.length ?? 0}</b> <span className="text-fg-soft sm:text-fg">{posts?.length === 1 ? "Beitrag" : "Beiträge"}</span></span>
              <Link href={`/characters/${character.id}/follows?tab=followers`} className="flex flex-col hover:opacity-70 sm:block"><b className="font-semibold">{followerCount ?? 0}</b> <span className="text-fg-soft sm:text-fg">Follower</span></Link>
              <Link href={`/characters/${character.id}/follows?tab=following`} className="flex flex-col hover:opacity-70 sm:block"><b className="font-semibold">{followingCount ?? 0}</b> <span className="text-fg-soft sm:text-fg">Gefolgt</span></Link>
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
          {isActiveProfile ? (
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
              {isOwn && (
                <Link href={`/characters/${character.id}/edit`} aria-label="Bearbeiten" className={`${buttonBase} flex-none bg-surface-2 text-fg hover:bg-surface-3`}>
                  <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                </Link>
              )}
            </>
          )}
        </div>

        {(highlightGroups.length > 0 || isActiveProfile) && (
          <div className="mt-5 flex gap-4 overflow-x-auto pb-1">
            {highlightGroups.map((g, i) => {
              const cover = g.stories[0];
              return (
                <div key={g.key} className="flex w-[72px] shrink-0 flex-col items-center gap-1.5">
                  <StoryLauncher groups={highlightGroups} startIndex={i} ringWidth={2} label={`Highlight ${g.label}`}>
                    <span className="block h-14 w-14 overflow-hidden rounded-full bg-surface-2">
                      {cover.video_url ? (
                        <video src={`${cover.video_url}#t=0.1`} preload="metadata" muted playsInline className="h-full w-full object-cover" />
                      ) : cover.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cover.image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span
                          className="block h-full w-full"
                          style={{ background: storyBackground(cover.bg) }}
                        />
                      )}
                    </span>
                  </StoryLauncher>
                  <span className="w-full truncate text-center text-xs text-fg">{g.label}</span>
                </div>
              );
            })}
            {isActiveProfile && (
              <Link
                href={`/characters/${character.id}/highlights/new`}
                className="flex w-[72px] shrink-0 flex-col items-center gap-1.5"
              >
                <span className="flex h-[62px] w-[62px] items-center justify-center rounded-full border border-line bg-surface-2 text-fg-soft">
                  <Plus className="h-6 w-6" strokeWidth={2} />
                </span>
                <span className="text-xs text-fg-soft">Neu</span>
              </Link>
            )}
          </div>
        )}

        {character.sheet_url && (
          <details open className="group mt-6 rounded-2xl border border-line">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-fg [&::-webkit-details-marker]:hidden">
              Charakterbogen
              <ChevronDown className="h-4 w-4 text-muted transition group-open:rotate-180" strokeWidth={2} />
            </summary>
            <div className="px-2 pb-2">
              <CharacterSheetEmbed sheetUrl={character.sheet_url} />
            </div>
          </details>
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
              const image = post.media_type === "image" ? post.media_url : post.media_type ? null : firstImageSrc(post.content);
              const replies = post.comments?.[0]?.count ?? 0;
              return (
                <Link
                  key={post.id}
                  href={`/posts/${post.id}`}
                  className="group relative block aspect-square overflow-hidden bg-surface-2"
                >
                  {post.media_type === "video" && post.media_url ? (
                    <PostMedia url={post.media_url} type="video" alt="" thumb className="h-full w-full object-cover" />
                  ) : image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt={post.title || "Beitrag"} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full flex-col justify-center gap-1 overflow-hidden bg-surface-3 p-2 sm:p-4">
                      {post.title ? (
                        <>
                          <p className="line-clamp-3 font-serif text-sm leading-tight text-fg sm:text-xl">{post.title}</p>
                          <p className="line-clamp-3 hidden text-xs text-fg-soft sm:block">{stripHtml(post.content)}</p>
                        </>
                      ) : (
                        <p className="line-clamp-5 font-serif text-sm leading-tight text-fg sm:text-lg">{stripHtml(post.content)}</p>
                      )}
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
    </ProfileThemeWrapper>
  );
}
