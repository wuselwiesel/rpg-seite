import { notFound, redirect } from "next/navigation";
import { Dices } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveCharacter, getMentionableCharacters } from "@/lib/active-character";
import { CharacterAvatar } from "@/components/character-avatar";
import { MentionText } from "@/components/mention-text";
import { formatDateTime } from "@/lib/format";
import { sanitizePostHtml } from "@/lib/sanitize";
import type { StoryEntry, StoryPost } from "@/lib/types";
import { StoryComposer } from "./story-composer";

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
    .select("*, characters(*), roll_target_character:roll_target_character_id(name)")
    .eq("story_post_id", id)
    .order("created_at", { ascending: true })
    .returns<StoryEntry[]>();

  const mentionableCharacters = await getMentionableCharacters(user.id, storyPost.world_id);
  const rollTargets = mentionableCharacters.filter((c) => c.id !== activeCharacter?.id);

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
              {entry.roll_label ? (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <Dices className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} />
                  <span className="text-fg-soft">
                    würfelt auf <span className="font-medium text-fg">„{entry.roll_label}“</span>
                    {entry.roll_target_character?.name && (
                      <>
                        {" "}
                        gegen{" "}
                        <span className="font-medium text-fg">{entry.roll_target_character.name}</span>
                      </>
                    )}
                    : {entry.roll_result}/{entry.roll_value} (W{entry.roll_die})
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      entry.roll_success
                        ? "bg-green-500/15 text-green-700 dark:text-green-400"
                        : "bg-red-500/15 text-red-700 dark:text-red-400"
                    }`}
                  >
                    {entry.roll_success ? "Erfolg" : "Misserfolg"}
                  </span>
                </div>
              ) : (
                <MentionText text={entry.content} className="whitespace-pre-line text-sm text-fg-soft" />
              )}
            </div>
          </div>
        ))}
      </div>

      <StoryComposer
        storyPostId={storyPost.id}
        worldId={storyPost.world_id}
        characterName={activeCharacter?.name ?? "deinem Charakter"}
        characters={rollTargets}
        sheetUrl={activeCharacter?.sheet_url}
      />
    </div>
  );
}
