import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveCharacter, getMentionableCharacters } from "@/lib/active-character";
import { CharacterAvatar } from "@/components/character-avatar";
import { formatDateTime, timeAgoShort } from "@/lib/format";
import { stripHtml } from "@/lib/strip-html";
import { sanitizePostHtml } from "@/lib/sanitize";
import type { StoryEntry, StoryPost } from "@/lib/types";
import { StoryComposer } from "./story-composer";
import { StoryEntryItem } from "./story-entry-item";
import { StoryPostControls } from "./story-post-controls";

export default async function StoryPostDetailPage({
  params,
}: PageProps<"/story/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: storyPost } = await supabase
    .from("story_posts")
    .select("*, characters!story_posts_character_id_fkey(*), story_arcs(name)")
    .eq("id", id)
    .maybeSingle<StoryPost>();

  if (!storyPost) notFound();

  const activeCharacter = await getActiveCharacter(user.id, storyPost.world_id);

  const { data: entries } = await supabase
    .from("story_entries")
    .select(
      "*, characters!story_entries_character_id_fkey(*), roll_target_character:roll_target_character_id(name)",
    )
    .eq("story_post_id", id)
    .order("created_at", { ascending: true })
    .returns<StoryEntry[]>();

  const mentionableCharacters = await getMentionableCharacters(user.id, storyPost.world_id);
  const rollTargets = mentionableCharacters.filter((c) => c.id !== activeCharacter?.id);

  const { data: myCharacters } = await supabase
    .from("characters")
    .select("id")
    .eq("owner_id", user.id);
  const myCharacterIds = new Set((myCharacters ?? []).map((c) => c.id));

  const [{ data: world }, { data: bookmark }] = await Promise.all([
    supabase.from("worlds").select("created_by").eq("id", storyPost.world_id).maybeSingle(),
    supabase
      .from("story_bookmarks")
      .select("id")
      .eq("user_id", user.id)
      .eq("story_post_id", storyPost.id)
      .maybeSingle(),
  ]);
  const isWorldOwner = world?.created_by === user.id;

  // Ingame-Beiträge, die mit dieser Story-Szene verknüpft sind ("Aus der Story").
  const { data: linkedPosts } = await supabase
    .from("posts")
    .select("id, content, media_url, media_type, created_at, characters(name, username)")
    .eq("story_post_id", id)
    .lte("publish_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(10)
    .returns<
      {
        id: string;
        content: string;
        media_url: string | null;
        media_type: string | null;
        created_at: string;
        characters: { name: string; username: string | null } | null;
      }[]
    >();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <article className="mb-8 rounded-lg border border-line bg-surface p-6">
        <StoryPostControls
          storyPostId={storyPost.id}
          isPrivate={storyPost.is_private}
          pinned={storyPost.pinned}
          locked={storyPost.locked}
          archived={storyPost.archived}
          isWorldOwner={isWorldOwner}
          initialBookmarked={!!bookmark}
        />
        <div className="mb-4 flex items-center gap-3">
          <CharacterAvatar
            name={storyPost.characters?.name ?? "?"}
            avatarUrl={storyPost.characters?.avatar_url}
          />
          <div>
            <p className="font-medium text-fg">{storyPost.characters?.name}</p>
            <p className="text-xs text-muted">{formatDateTime(storyPost.created_at)}</p>
          </div>
        </div>
        {storyPost.story_arcs?.name && storyPost.arc_id && (
          <Link
            href={`/story?arc=${storyPost.arc_id}`}
            className="mb-2 inline-flex w-fit items-center rounded-full bg-accent-strong/15 px-2.5 py-0.5 text-xs font-medium text-accent transition hover:bg-accent-strong/25"
          >
            {storyPost.story_arcs.name}
          </Link>
        )}
        <h1 className="mb-4 font-serif text-3xl text-fg">{storyPost.title}</h1>
        <div
          className="post-content text-fg-soft"
          dangerouslySetInnerHTML={{ __html: sanitizePostHtml(storyPost.content) }}
        />
      </article>

      <h2 className="mb-4 font-serif text-xl text-fg">
        Fortsetzungen {entries?.length ? `(${entries.length})` : ""}
      </h2>

      <div className="mb-6 flex flex-col gap-4">
        {entries?.map((entry) => (
          <StoryEntryItem
            key={entry.id}
            entry={entry}
            storyPostId={storyPost.id}
            canManage={myCharacterIds.has(entry.character_id)}
            mentionCharacters={mentionableCharacters}
          />
        ))}
      </div>

      {linkedPosts && linkedPosts.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-serif text-xl text-fg">Im Ingame-Feed dazu</h2>
          <ul className="flex flex-col gap-2">
            {linkedPosts.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/posts/${p.id}`}
                  className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 transition hover:bg-surface-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-fg">
                      {p.characters?.username ?? p.characters?.name}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {stripHtml(p.content) || (p.media_type === "video" ? "Video" : "Foto")}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted">{timeAgoShort(p.created_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {storyPost.locked ? (
        <p className="text-sm text-muted">Diese Szene ist gesperrt – keine neuen Fortsetzungen möglich.</p>
      ) : (
        <StoryComposer
          storyPostId={storyPost.id}
          worldId={storyPost.world_id}
          characterName={activeCharacter?.name ?? "deinem Charakter"}
          characters={rollTargets}
          sheetUrl={activeCharacter?.sheet_url}
        />
      )}
    </div>
  );
}
