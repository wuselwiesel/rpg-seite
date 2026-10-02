import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMentionableCharacters, getActiveCharacter, getOwnCharacters } from "@/lib/active-character";
import { getActiveWorld } from "@/lib/worlds";
import { CharacterAvatar } from "@/components/character-avatar";
import { PostMedia } from "@/components/post-media";
import { ReactionBar } from "@/components/reaction-bar";
import { formatDateTime } from "@/lib/format";
import { sanitizePostHtml } from "@/lib/sanitize";
import { autolinkHtml } from "@/lib/autolink";
import { getWikiTerms } from "@/lib/wiki-terms";
import { aggregateReactions } from "@/lib/reactions";
import type { Comment, Post } from "@/lib/types";
import { CommentThread } from "./comment-thread";
import { PostBody } from "./post-body";
import { htmlCaptionToPlainText } from "@/lib/strip-html";
import { MediaCarousel } from "@/components/media-carousel";
import { PinPostButton } from "@/components/pin-post-button";
import { DeletePostButton } from "@/components/delete-post-button";
import { EditPostDateButton } from "@/components/edit-post-date-button";
import { SharePostButton } from "@/components/share-post-button";
import { CharacterThemed } from "@/components/character-themed";
import Link from "next/link";
import { BookOpen } from "lucide-react";

export default async function PostDetailPage({
  params,
}: PageProps<"/posts/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: post } = await supabase
    .from("posts")
    .select("*, characters!posts_character_id_fkey(*), reactions(emoji, character_id, characters(name)), story_post:story_post_id(id, title), post_tags(characters(id, name, username))")
    .eq("id", id)
    .maybeSingle<Post>();

  if (!post) notFound();
  // Geplante Beiträge sieht nur die Besitzerin/der Besitzer.
  const isOwnPost = post.characters?.owner_id === user.id;
  if (post.publish_at && new Date(post.publish_at) > new Date() && !isOwnPost) notFound();

  const [{ data: comments }, { data: myCharacters }] = await Promise.all([
    supabase
      .from("comments")
      .select("*, characters(*), likes(character_id)")
      .eq("post_id", id)
      .order("created_at", { ascending: true })
      .returns<Comment[]>(),
    supabase.from("characters").select("id").eq("owner_id", user.id),
  ]);
  const myCharacterIds = new Set((myCharacters ?? []).map((c) => c.id));

  // Zuletzt benutzte NPC-Profile (Name + Avatar) dieser Account-Inhaberin/dieses -Inhabers,
  // zur Wiederverwendung beim Erstellen eines neuen NPC-Kommentars - geht auf jedem sichtbaren
  // Beitrag, nicht nur auf eigenen.
  const recentFakeProfiles: { name: string; avatarUrl: string | null }[] = [];
  {
    const { data: fakeRows } = await supabase
      .from("comments")
      .select("fake_name, fake_avatar_url, created_at")
      .eq("fake_author_id", user.id)
      .not("fake_name", "is", null)
      .order("created_at", { ascending: false })
      .limit(50);
    const seen = new Set<string>();
    for (const row of fakeRows ?? []) {
      if (!row.fake_name || seen.has(row.fake_name)) continue;
      seen.add(row.fake_name);
      recentFakeProfiles.push({ name: row.fake_name, avatarUrl: row.fake_avatar_url });
      if (recentFakeProfiles.length >= 10) break;
    }
  }
  // Reaktionen gehören dem aktiven Charakter: nur seine zählen als "von mir".
  const activeWorld = await getActiveWorld(user.id);
  const activeCharacter = activeWorld ? await getActiveCharacter(user.id, activeWorld.id) : null;
  const activeCharacterSet = new Set(activeCharacter ? [activeCharacter.id] : []);
  const worldCharacters = post.characters ? await getOwnCharacters(user.id, post.characters.world_id) : [];
  const likeCharacters = worldCharacters.map((c) => ({ id: c.id, name: c.name, avatar_url: c.avatar_url }));

  const mentionableCharacters = post.characters
    ? await getMentionableCharacters(user.id, post.characters.world_id)
    : [];

  const wikiTerms = post.characters ? await getWikiTerms(post.characters.world_id) : [];
  const contentHtml = autolinkHtml(sanitizePostHtml(post.content), { wiki: wikiTerms, tagHref: "/" });

  return (
    <CharacterThemed character={post.characters}>
    <div className="mx-auto max-w-2xl xl:max-w-3xl px-4 py-6 sm:py-10">
      <article className="mb-8 rounded-lg border border-line bg-surface p-4 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <Link href={`/characters/${post.character_id}`}>
            <CharacterAvatar name={post.characters?.name ?? "?"} avatarUrl={post.characters?.avatar_url} />
          </Link>
          <div className="min-w-0 flex-1">
            <Link href={`/characters/${post.character_id}`} className="block truncate font-medium text-fg">
              {post.characters?.name}
            </Link>
            <p className="text-xs text-muted">
              {post.publish_at && new Date(post.publish_at) > new Date()
                ? `Geplant für ${formatDateTime(post.publish_at)}`
                : formatDateTime(post.created_at)}
            </p>
          </div>
          {isOwnPost && (
            <div className="flex flex-wrap items-start justify-end gap-2">
              <EditPostDateButton postId={post.id} createdAt={post.created_at} />
              <PinPostButton postId={post.id} initialPinned={post.pinned ?? false} />
              <DeletePostButton postId={post.id} />
            </div>
          )}
        </div>
        {post.story_post && (
          <Link
            href={`/story/${post.story_post.id}`}
            className="mb-4 flex w-fit max-w-full items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-xs text-fg-soft transition hover:bg-surface-3 hover:text-fg"
          >
            <BookOpen className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            <span className="truncate">Aus der Story: {post.story_post.title}</span>
          </Link>
        )}
        {post.post_tags && post.post_tags.length > 0 && (
          <p className="mb-3 flex flex-wrap items-center gap-x-1.5 text-sm text-fg-soft">
            <span className="text-muted">Mit</span>
            {post.post_tags.map((t) =>
              t.characters ? (
                <Link key={t.characters.id} href={`/characters/${t.characters.id}`} className="font-medium text-accent hover:underline">
                  {t.characters.username ? `@${t.characters.username}` : t.characters.name}
                </Link>
              ) : null,
            )}
          </p>
        )}
        {post.title && <h1 className="mb-4 font-serif text-3xl text-fg">{post.title}</h1>}
        {post.media_urls && post.media_urls.length > 1 ? (
          <MediaCarousel urls={post.media_urls} alt="Beitragsbild" className="mb-4 overflow-hidden rounded-lg" />
        ) : (
          post.media_url &&
          post.media_type && (
            <PostMedia
              url={post.media_url}
              type={post.media_type}
              alt="Beitragsbild"
              className="mb-4 max-h-[75vh] w-full rounded-lg bg-black object-contain"
            />
          )
        )}
        <PostBody
          postId={post.id}
          contentHtml={contentHtml}
          rawContent={post.media_type ? htmlCaptionToPlainText(post.content) : post.content}
          hasMedia={Boolean(post.media_type)}
          isOwnPost={isOwnPost}
          mentionable={mentionableCharacters}
        />
        <div className="mt-4">
          <ReactionBar
            heart
            target={{ postId: post.id }}
            initialReactions={aggregateReactions(post.reactions, activeCharacterSet)}
            myCharacters={likeCharacters}
            activeCharacterId={activeCharacter?.id}
            bonusLikes={post.bonus_likes ?? 0}
            isOwn={isOwnPost}
            commentSlot={activeCharacter ? <SharePostButton postId={post.id} characterId={activeCharacter.id} /> : null}
          />
        </div>
      </article>

      <CommentThread
        postId={post.id}
        comments={comments ?? []}
        activeCharacter={activeCharacter}
        myCharacterIds={Array.from(myCharacterIds)}
        currentUserId={user.id}
        recentFakeProfiles={recentFakeProfiles}
        mentionable={mentionableCharacters}
      />
    </div>
    </CharacterThemed>
  );
}
