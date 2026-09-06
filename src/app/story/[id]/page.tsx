import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveCharacter } from "@/lib/active-character";
import { CharacterAvatar } from "@/components/character-avatar";
import { MentionText } from "@/components/mention-text";
import { formatDateTime } from "@/lib/format";
import { sanitizePostHtml } from "@/lib/sanitize";
import type { Character, StoryEntry, StoryPost } from "@/lib/types";
import { StoryEntryForm } from "./story-entry-form";

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
    .select("*, characters(*)")
    .eq("id", id)
    .maybeSingle<StoryPost>();

  if (!storyPost) notFound();

  const activeCharacter = await getActiveCharacter(user.id, storyPost.world_id);

  const { data: entries } = await supabase
    .from("story_entries")
    .select("*, characters(*)")
    .eq("story_post_id", id)
    .order("created_at", { ascending: true })
    .returns<StoryEntry[]>();

  const { data: worldCharacters } = await supabase
    .from("characters")
    .select("*")
    .eq("world_id", storyPost.world_id)
    .order("name")
    .returns<Character[]>();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <article className="mb-8 rounded-lg border border-line bg-surface p-6">
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
          <div key={entry.id} className="flex gap-3">
            <CharacterAvatar
              name={entry.characters?.name ?? "?"}
              avatarUrl={entry.characters?.avatar_url}
              size={32}
            />
            <div className="flex-1 rounded-lg border border-line bg-surface px-4 py-2">
              <div className="mb-1 flex items-baseline gap-2">
                <p className="text-sm font-medium text-fg">{entry.characters?.name}</p>
                <p className="text-xs text-muted">{formatDateTime(entry.created_at)}</p>
              </div>
              <MentionText text={entry.content} className="whitespace-pre-line text-sm text-fg-soft" />
            </div>
          </div>
        ))}
      </div>

      <StoryEntryForm
        storyPostId={storyPost.id}
        worldId={storyPost.world_id}
        characterName={activeCharacter?.name ?? "deinem Charakter"}
        characters={worldCharacters ?? []}
      />
    </div>
  );
}
