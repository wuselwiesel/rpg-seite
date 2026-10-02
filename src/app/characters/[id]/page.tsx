import { BadgeRow } from "@/components/badge-row";
import { CharacterTimeline } from "@/components/character-timeline";
import { getCharacterBadges, syncCharacterBadges } from "@/lib/badges-server";
import { EmojiText } from "@/components/custom-emoji-provider";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AtSign, ChevronDown, Clock, Grid3x3, Images, MessageCircle, Pencil, Pin, Rows3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { getActiveCharacter, getOwnCharacters } from "@/lib/active-character";
import { POST_SELECT, toFeedPost } from "@/lib/feed";
import { SocialPostCard } from "@/components/social-post-card";
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
  searchParams,
}: PageProps<"/characters/[id]">) {
  const { id } = await params;
  const { tab: tabParam, ansicht } = await searchParams;
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

  const isOwnerView = character.owner_id === user.id;
  const tab = tabParam === "tagged" ? "tagged" : tabParam === "scheduled" && isOwnerView ? "scheduled" : "posts";
  const listView = ansicht === "liste";
  const nowIso = new Date().toISOString();

  let postsQuery = supabase
    .from("posts")
    .select(POST_SELECT)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });
  if (tab === "tagged") {
    // Erwähnungen (@) im Beitragstext: <span data-type="mention" data-id="...">
    const { data: tagRows } = await supabase.from("post_tags").select("post_id").eq("character_id", id);
    const taggedIds = (tagRows ?? []).map((r) => r.post_id as string);
    postsQuery = postsQuery
      .or(`content.ilike.%data-id="${id}"%${taggedIds.length ? `,id.in.(${taggedIds.join(",")})` : ""}`)
      .lte("publish_at", nowIso)
      .neq("character_id", id);
  } else if (tab === "scheduled") {
    postsQuery = postsQuery.eq("character_id", id).gt("publish_at", nowIso);
  } else {
    postsQuery = postsQuery.eq("character_id", id).lte("publish_at", nowIso);
  }
  if (listView) postsQuery = postsQuery.limit(30);

  const [{ data: posts }, { count: publishedCount }, activeWorld] = await Promise.all([
    postsQuery.returns<Post[]>(),
    supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("character_id", id)
      .lte("publish_at", nowIso),
    getActiveWorld(user.id),
  ]);

  const activeCharacter = activeWorld ? await getActiveCharacter(user.id, activeWorld.id) : null;
  if (character.owner_id === user.id) await syncCharacterBadges(character.id);
  const badges = await getCharacterBadges(character.id);
  const myCharacters = activeWorld
    ? (await getOwnCharacters(user.id, activeWorld.id)).map((c) => ({ id: c.id, name: c.name, avatar_url: c.avatar_url }))
    : [];

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

  const profileHref = (tabId: string, list: boolean) => {
    const q = new URLSearchParams();
    if (tabId !== "posts") q.set("tab", tabId);
    if (list) q.set("ansicht", "liste");
    const qs = q.toString();
    return `/characters/${id}${qs ? `?${qs}` : ""}`;
  };

  const buttonBase = "flex flex-1 whitespace-nowrap items-center justify-center gap-2 rounded-lg px-4 py-1.5 text-sm font-semibold transition";

  return (
    <ProfileThemeWrapper
      theme={{ font: character.theme_font, accent: character.theme_accent, bg: character.theme_bg }}
    >
      <div className="mx-auto max-w-[935px] sm:px-4 sm:pt-6">
        <div className="h-32 overflow-hidden bg-gradient-to-br from-accent/40 to-accent-strong/40 sm:h-52 sm:rounded-2xl">
          {character.banner_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={character.banner_url} alt="" className="h-full w-full object-cover" />
          )}
        </div>

        <div className="px-4 sm:px-6">
        <header>
          <div className="-mt-12 flex items-end gap-4 sm:-mt-16">
            <div className="shrink-0">
              {(() => {
                const avatar = (
                  <div className="h-[88px] w-[88px] overflow-hidden rounded-full bg-surface-2 sm:h-[128px] sm:w-[128px]">
                    {character.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={character.avatar_url} alt={character.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl font-semibold sm:text-5xl">
                        {character.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                );
                return (
                  <div className="relative">
                    {storyGroups.length > 0 ? (
                      <StoryLauncher groups={storyGroups} ringWidth={3} label="Story ansehen" viewerCharacterId={activeCharacter?.id}>
                        {avatar}
                      </StoryLauncher>
                    ) : (
                      <div className="rounded-full bg-app p-[4px]">{avatar}</div>
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

            <div className="ml-auto hidden gap-2 pb-1 sm:flex">
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

          <h1 className="mt-3 truncate text-xl font-semibold text-fg sm:text-2xl">{character.name}</h1>
          <p className="text-sm text-muted">
            {character.username ? `@${character.username}` : isOwn ? "kein.nutzername" : null}
            {character.worlds?.name && <>{character.username || isOwn ? " · " : ""}in {character.worlds.name}</>}
          </p>

          <div className="mt-4 flex gap-6 text-sm text-fg-soft">
            <span><b className="font-semibold text-fg">{publishedCount ?? 0}</b> {publishedCount === 1 ? "Beitrag" : "Beiträge"}</span>
            <Link href={`/characters/${character.id}/follows?tab=followers`} className="hover:opacity-70"><b className="font-semibold text-fg">{followerCount ?? 0}</b> Follower</Link>
            <Link href={`/characters/${character.id}/follows?tab=following`} className="hover:opacity-70"><b className="font-semibold text-fg">{followingCount ?? 0}</b> Gefolgt</Link>
          </div>

          {character.status_text && (
            <p className="mt-3 inline-block rounded-full bg-surface-2 px-3 py-1 text-sm text-fg-soft"><EmojiText text={character.status_text} /></p>
          )}

          {character.bio && (
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-fg">
              <EmojiText text={character.bio} />
            </p>
          )}

          {(character.custom_fields?.length ?? 0) > 0 && (
            <dl className="mt-4 grid gap-2 sm:grid-cols-2">
              {character.custom_fields!.map((f, i) => (
                <div key={i} className="rounded-xl bg-surface-2 px-3 py-2.5">
                  <dt className="flex items-center gap-1.5 text-xs font-medium text-muted">
                    {f.icon && <EmojiText text={f.icon} />}
                    {f.title}
                  </dt>
                  <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm text-fg">
                    <EmojiText text={f.text} />
                  </dd>
                </div>
              ))}
            </dl>
          )}

          <BadgeRow badges={badges} />
        </header>

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
                  <StoryLauncher groups={highlightGroups} startIndex={i} ringWidth={2} label={`Highlight ${g.label}`} viewerCharacterId={activeCharacter?.id}>
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


        <CharacterTimeline character={character} />
        </div>

        <div className="mt-6 flex justify-center gap-2 border-t border-line sm:gap-6">
          {[
            { id: "posts", label: "Beiträge", icon: Grid3x3, show: true },
            { id: "tagged", label: "Getaggt", icon: AtSign, show: true },
            { id: "scheduled", label: "Geplant", icon: Clock, show: isOwnerView },
          ]
            .filter((t) => t.show)
            .map(({ id: tabId, label, icon: Icon }) => (
              <Link
                key={tabId}
                href={profileHref(tabId, listView)}
                replace
                scroll={false}
                aria-current={tab === tabId ? "page" : undefined}
                className={`-mt-px flex items-center gap-1.5 border-t px-4 py-3 text-xs font-semibold uppercase tracking-widest transition ${
                  tab === tabId ? "border-fg text-fg" : "border-transparent text-muted hover:text-fg-soft"
                }`}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                {label}
              </Link>
            ))}
        </div>

        <div className="flex justify-end gap-1 px-3 pt-2 sm:px-0" role="group" aria-label="Ansicht">
          <Link
            href={profileHref(tab, false)}
            replace
            scroll={false}
            aria-label="Raster"
            aria-current={!listView ? "true" : undefined}
            className={`rounded-md p-1.5 transition ${!listView ? "bg-surface-2 text-fg" : "text-muted hover:text-fg"}`}
          >
            <Grid3x3 className="h-4 w-4" strokeWidth={2} />
          </Link>
          <Link
            href={profileHref(tab, true)}
            replace
            scroll={false}
            aria-label="Liste"
            aria-current={listView ? "true" : undefined}
            className={`rounded-md p-1.5 transition ${listView ? "bg-surface-2 text-fg" : "text-muted hover:text-fg"}`}
          >
            <Rows3 className="h-4 w-4" strokeWidth={2} />
          </Link>
        </div>

        {posts?.length && listView && activeCharacter && activeWorld ? (
          <div className="mx-auto max-w-[470px] px-3 pb-24 pt-4 sm:px-0 lg:pb-10">
            {posts.map((post, i) => (
              <SocialPostCard
                key={post.id}
                post={toFeedPost(post, activeCharacter.id, activeWorld.id)}
                activeCharacterId={activeCharacter.id}
                myCharacters={myCharacters}
                tagHrefBase="/"
                priority={i === 0}
              />
            ))}
          </div>
        ) : posts?.length ? (
          <div className="grid grid-cols-3 gap-[3px] pb-24 sm:gap-1 lg:pb-10">
            {posts.map((post) => {
              const image = post.media_type === "image" ? post.media_url : post.media_type ? null : firstImageSrc(post.content);
              const multi = (post.media_urls?.length ?? 0) > 1;
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
                  {(post.pinned || multi) && (
                    <span className="absolute right-1.5 top-1.5 flex gap-1 text-white drop-shadow">
                      {post.pinned && <Pin className="h-4 w-4 fill-white" strokeWidth={1.5} aria-label="Angepinnt" />}
                      {multi && <Images className="h-4 w-4" strokeWidth={2} aria-label="Mehrere Fotos" />}
                    </span>
                  )}
                  {tab === "scheduled" && post.publish_at && (
                    <span className="absolute inset-x-0 bottom-0 bg-black/60 px-1.5 py-1 text-center text-[10px] font-medium text-white">
                      {new Date(post.publish_at).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </span>
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
          <p className="py-16 text-center text-muted">
            {tab === "tagged" ? "Noch nicht in Beiträgen markiert." : tab === "scheduled" ? "Keine geplanten Beiträge." : "Noch keine Beiträge."}
          </p>
        )}
      </div>
    </ProfileThemeWrapper>
  );
}
