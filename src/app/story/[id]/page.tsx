import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { SceneSummary } from "./scene-summary";
import { recapToHtml } from "@/lib/recap-html";
import { createClient } from "@/lib/supabase/server";
import { getActiveCharacter, getMentionableCharacters, getOwnCharacters, getOwnNpcs } from "@/lib/active-character";
import { CharacterAvatar } from "@/components/character-avatar";
import { NarratorAvatar } from "@/components/narrator-avatar";
import { formatDateTime, timeAgoShort } from "@/lib/format";
import { stripHtml } from "@/lib/strip-html";
import { sanitizePostHtml } from "@/lib/sanitize";
import { autolinkHtml } from "@/lib/autolink";
import { parseMentionedCharacterIdsFromHtml } from "@/lib/mentions";
import { getWikiTerms } from "@/lib/wiki-terms";
import { getWikiCalendar } from "@/lib/wiki-calendar-data";
import { getWikiTypes } from "@/lib/wiki-data";
import { datesFromRow } from "@/lib/wiki-calendar";
import type { StoryEntry, StoryPost } from "@/lib/types";
import { StoryComposer } from "./story-composer";
import { StoryEntryItem } from "./story-entry-item";
import { EntryList } from "./entry-list";
import { ClipSelectionProvider } from "./clip-selection";
import { ScrollToLast } from "./scroll-to-last";
import { ScrollToEntry } from "./scroll-to-entry";
import { JumpToLast } from "./jump-to-last";
import { ChapterJump } from "./chapter-jump";
import { StoryPostControls } from "./story-post-controls";
import { SceneMeta } from "./scene-meta";
import { StoryPostBody } from "./story-post-body";
import { TurnBanner } from "./turn-banner";
import { SceneRecap } from "./scene-recap";
import { SceneChain } from "./scene-chain";
import { SceneMarkFlag } from "./scene-mark-flag";
import { OnlineMembers } from "@/components/online-members";
import { getWorldMembers } from "@/lib/world-members";

export default async function StoryPostDetailPage({
  params,
  searchParams,
}: PageProps<"/story/[id]">) {
  const { id } = await params;
  const { as: asCharacterId, ziel, zusammenfassung, chat: chatParam } = await searchParams;
  // Aus einer Benachrichtigung ("… wartet auf dich"): direkt zum letzten Beitrag springen.
  const jumpToLast = ziel === "ende" || typeof asCharacterId === "string";
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
  const worldMembers = await getWorldMembers(storyPost.world_id);

  // Aus einer Benachrichtigung ("… wartet auf dich"): zum angesprochenen Charakter wechseln.
  if (typeof asCharacterId === "string" && asCharacterId !== activeCharacter?.id) {
    const { data: wanted } = await supabase
      .from("characters")
      .select("id")
      .eq("id", asCharacterId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (wanted) {
      redirect(`/switch-character?character=${wanted.id}&next=${encodeURIComponent(`/story/${id}?ziel=ende`)}`);
    }
  }

  const { data: entries } = await supabase
    .from("story_entries")
    .select(
      "*, characters!story_entries_character_id_fkey(*), roll_target_character:roll_target_character_id(name)",
    )
    .eq("story_post_id", id)
    .order("created_at", { ascending: true })
    .returns<StoryEntry[]>();

  const mentionableCharacters = await getMentionableCharacters(user.id, storyPost.world_id);
  // In Szenen schreibt man als eigener Charakter oder als eigener NPC (die Auswahl trennt beides)
  const ownCharacters = [...(await getOwnCharacters(user.id, storyPost.world_id)), ...(await getOwnNpcs(user.id, storyPost.world_id))];

  const { data: myCharacters } = await supabase
    .from("characters")
    .select("id")
    .eq("owner_id", user.id);
  const myCharacterIds = new Set((myCharacters ?? []).map((c) => c.id));

  const [wikiTerms, calendar] = await Promise.all([getWikiTerms(storyPost.world_id), getWikiCalendar(storyPost.world_id)]);
  const link = (html: string) => autolinkHtml(html, { wiki: wikiTerms, tagHref: "/story" });

  // Kapitel = neue Szene: vorherige und nächste Szene (die Sichtbarkeit regelt die Datenbank), dazu die Orte der Welt für die Auswahl
  const [{ data: prevScene }, { data: nextScene }, { data: locationRows }] = await Promise.all([
    storyPost.previous_story_id
      ? supabase.from("story_posts").select("id, title, recap").eq("id", storyPost.previous_story_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("story_posts").select("id, title").eq("previous_story_id", storyPost.id).maybeSingle(),
    supabase.from("story_posts").select("location").eq("world_id", storyPost.world_id).not("location", "is", null),
  ]);
  // Nachrichten dieser Szene, aus denen schon ein Ereignis gemacht wurde (Flagge an der Nachricht)
  const [{ data: markedRows }, wikiTypes] = await Promise.all([
    supabase.from("wiki_pages").select("id, title, source_entry_id").eq("source_story_id", storyPost.id),
    getWikiTypes(storyPost.world_id),
  ]);
  const markedByEntry = new Map((markedRows ?? []).filter((r) => r.source_entry_id).map((r) => [r.source_entry_id as string, { id: r.id as string, title: r.title as string }]));
  const sceneMark = (markedRows ?? []).find((r) => !r.source_entry_id);
  const eventType = wikiTypes.some((t) => t.id === "ereignis") ? "ereignis" : null;

  // Auswahl für „Vorherige Szene“: andere Szenen der Welt, die noch keine Folgeszene haben (außer der jetzigen vorherigen)
  const { data: chainRows } = await supabase
    .from("story_posts")
    .select("id, title, previous_story_id")
    .eq("world_id", storyPost.world_id)
    .neq("id", storyPost.id)
    .order("created_at", { ascending: false })
    .limit(300);
  const taken = new Set((chainRows ?? []).map((r) => r.previous_story_id).filter(Boolean));
  const chainOptions = (chainRows ?? [])
    .filter((r) => r.id === storyPost.previous_story_id || !taken.has(r.id))
    .map((r) => ({ id: r.id as string, title: r.title as string }));
  const locations = Array.from(new Set((locationRows ?? []).map((r) => r.location as string))).sort();

  const [{ data: world }, { data: bookmark }] = await Promise.all([
    supabase.from("worlds").select("created_by").eq("id", storyPost.world_id).maybeSingle(),
    supabase
      .from("story_bookmarks")
      .select("id")
      .eq("user_id", user.id)
      .eq("story_post_id", storyPost.id)
      .maybeSingle(),
  ]);
  const { data: myWorldRole } = await supabase.from("world_members").select("role").eq("world_id", storyPost.world_id).eq("user_id", user.id).maybeSingle();
  // Besitzer:in oder Admin der Welt (Moderation: anpinnen, abschließen, archivieren)
  const isWorldOwner = world?.created_by === user.id || myWorldRole?.role === "admin";
  const isAuthor = myCharacterIds.has(storyPost.character_id);

  const chapters = (entries ?? []).filter((e) => e.kind === "chapter");
  const lastChapter = chapters[chapters.length - 1] ?? null;
  const continuations = (entries ?? []).filter((e) => e.kind !== "chapter");
  const writing = continuations.filter((e) => !e.roll_label);
  const lastWriter = (entries ?? []).length ? entries![entries!.length - 1].characters : storyPost.characters;
  const participantIds = Array.from(
    new Set([storyPost.character_id, ...(entries ?? []).map((e) => e.character_id)]),
  );
  const turnCharacter = storyPost.turn_character_id
    ? mentionableCharacters.find((c) => c.id === storyPost.turn_character_id) ?? null
    : null;
  const turnIsMine = !!turnCharacter && myCharacterIds.has(turnCharacter.id);
  const recapItems = writing.map((e) => ({
    id: e.id,
    name: e.kind === "narrator" ? "Erzähler:in" : (e.characters?.name ?? "?"),
    text: stripHtml(e.content),
    at: e.created_at,
  }));

  // Ingame-Beiträge, die mit dieser Story-Szene verknüpft sind ("Aus der Story").
  const { data: linkedPosts } = await supabase
    .from("posts")
    .select("id, content, media_url, media_type, created_at, characters!posts_character_id_fkey(name, username)")
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

  // Charaktere für den Filter: erst die eigenen, dann alle übrigen, die in der Szene schreiben oder erwähnt werden.
  const involvedIds = new Set<string>([storyPost.character_id, ...participantIds]);
  for (const e of entries ?? []) {
    if (e.kind !== "chapter") for (const id of parseMentionedCharacterIdsFromHtml(e.content)) involvedIds.add(id);
  }
  const writtenIds = new Set(participantIds);
  const filterCharacters = mentionableCharacters
    .filter((c) => myCharacterIds.has(c.id) || involvedIds.has(c.id))
    .map((c) => ({ id: c.id, name: c.name, own: myCharacterIds.has(c.id), wrote: writtenIds.has(c.id) }))
    .sort((a, b) => Number(b.own) - Number(a.own));

  return (
    <div className="relative isolate">
    {storyPost.ambience_image_url && (
      <div
        aria-hidden
        className="pointer-events-none sticky top-0 -z-10 -mb-[100dvh] h-dvh bg-cover bg-center opacity-25"
        style={{ backgroundImage: `url("${storyPost.ambience_image_url}")` }}
      />
    )}
    <div className="mx-auto max-w-2xl xl:max-w-3xl px-4 py-10">
      <OnlineMembers members={worldMembers} selfId={user.id} className="-mt-6 mb-2 flex justify-end" />
      <article className="mb-8 rounded-lg border border-line bg-surface p-6">
        <StoryPostControls
          storyPostId={storyPost.id}
          isPrivate={storyPost.is_private}
          spoiler={!!storyPost.is_spoiler}
          pinned={storyPost.pinned}
          locked={storyPost.locked}
          archived={storyPost.archived}
          isWorldOwner={isWorldOwner}
          isAuthor={isAuthor}
          initialBookmarked={!!bookmark}
        />
        <div className="mb-4 flex items-center gap-3">
          {storyPost.narrator ? (
            <NarratorAvatar size={40} />
          ) : (
            <CharacterAvatar
              name={storyPost.characters?.name ?? "?"}
              avatarUrl={storyPost.characters?.avatar_url}
            />
          )}
          <div>
            <p className="font-medium text-fg">{storyPost.narrator ? "Erzähler:in" : storyPost.characters?.name}</p>
            <p className="text-xs text-muted">{formatDateTime(storyPost.created_at)}</p>
          </div>
          {(myCharacterIds.size > 0 || isWorldOwner) && (
            <SceneMarkFlag
              storyId={storyPost.id}
              excerpt={stripHtml(storyPost.content).slice(0, 280)}
              calendar={calendar}
              eventType={eventType}
              defaultDate={datesFromRow(storyPost).start}
              marked={sceneMark ? { id: sceneMark.id as string, title: sceneMark.title as string } : null}
            />
          )}
        </div>
        <SceneChain
          storyPostId={storyPost.id}
          previous={prevScene ? { id: prevScene.id, title: prevScene.title } : null}
          next={nextScene ? { id: nextScene.id, title: nextScene.title } : null}
          options={chainOptions}
          canEdit={isAuthor || isWorldOwner}
        />
        {storyPost.story_arcs?.name && storyPost.arc_id && (
          <Link
            href={`/story?arc=${storyPost.arc_id}`}
            className="mb-2 inline-flex w-fit items-center rounded-full bg-accent-strong/15 px-2.5 py-0.5 text-xs font-medium text-accent transition hover:bg-accent-strong/25"
          >
            {storyPost.story_arcs.name}
          </Link>
        )}
        <StoryPostBody
          storyPostId={storyPost.id}
          title={storyPost.title}
          rawContent={storyPost.content}
          displayHtml={link(sanitizePostHtml(storyPost.content))}
          narrator={!!storyPost.narrator}
          spoiler={!!storyPost.is_spoiler}
          canEdit={myCharacterIds.has(storyPost.character_id) || isWorldOwner}
          metaSlot={
            <>
              <SceneMeta
                storyPostId={storyPost.id}
                location={storyPost.location}
                inWorldTime={storyPost.in_world_time}
                dates={datesFromRow(storyPost)}
                calendar={calendar}
                shortSummary={storyPost.short_summary ?? null}
                ambienceImage={storyPost.ambience_image_url ?? null}
                ambienceMusic={storyPost.ambience_music_url ?? null}
                canEdit={myCharacterIds.size > 0 || isWorldOwner}
              />
            </>
          }
        />
      </article>

      {turnCharacter && !storyPost.locked && (
        <TurnBanner
          storyPostId={storyPost.id}
          turnName={turnCharacter.name}
          waitingName={lastWriter && lastWriter.id !== turnCharacter.id ? lastWriter.name : null}
          isMine={turnIsMine}
        />
      )}

      <SceneSummary
        storyPostId={storyPost.id}
        recap={storyPost.recap ?? null}
        displayHtml={storyPost.recap ? link(sanitizePostHtml(recapToHtml(storyPost.recap))) : ""}
        recapAt={storyPost.recap_at ?? null}
        locked={storyPost.locked}
        mentionCharacters={mentionableCharacters}
        defaultOpen={zusammenfassung === "1"}
      />

      <SceneRecap
        storyPostId={storyPost.id}
        chapterTitle={lastChapter ? (lastChapter.chapter_title ?? null) : (prevScene?.recap ? prevScene.title : null)}
        chapterSummary={lastChapter ? (lastChapter.chapter_summary ?? null) : prevScene?.recap ? stripHtml(prevScene.recap).slice(0, 1500) : null}
        items={recapItems}
        aiSummary={storyPost.ai_summary ?? null}
        aiSummaryCount={storyPost.ai_summary_count ?? null}
        entryCount={writing.length}
        aiProvider={
          storyPost.is_private ? null : process.env.GROQ_API_KEY ? "Groq" : process.env.GEMINI_API_KEY ? "Google Gemini" : null
        }
      />

      {chapters.length > 0 && (
        <nav aria-label="Kapitel" className="mb-4 flex flex-wrap gap-2">
          {chapters.map((c, i) => (
            <a
              key={c.id}
              href={`#kapitel-${i + 1}`}
              className="rounded-full bg-surface-2 px-3 py-1 text-xs font-medium text-fg-soft transition hover:text-accent"
            >
              {c.chapter_label?.trim() || i + 1} · {c.chapter_title}
            </a>
          ))}
        </nav>
      )}

      <ClipSelectionProvider
        storyPostId={storyPost.id}
        sceneTitle={storyPost.title}
        ownCharacters={ownCharacters.map((c) => ({ id: c.id, name: c.name }))}
        activeCharacterId={activeCharacter?.id ?? null}
        canQuote={!storyPost.locked}
      >
      <ScrollToLast enabled={jumpToLast} />
      <ScrollToEntry />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-serif text-xl text-fg">
          Fortsetzungen {continuations.length ? `(${continuations.length})` : ""}
        </h2>
        {(entries?.length ?? 0) > 1 && <JumpToLast variant="inline" />}
      </div>
      {/* Schwebende Sprungknöpfe in einer Reihe: Kapitel (nur Symbol) links von „Zur letzten Nachricht“ */}
      <div className="pointer-events-none fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-20 flex items-center gap-2 lg:bottom-6">
        {chapters.length > 0 && <ChapterJump chapters={chapters.map((c, i) => ({ n: i + 1, title: c.chapter_title ?? c.content, label: c.chapter_label?.trim() || null }))} />}
        {(entries?.length ?? 0) > 1 && <JumpToLast variant="floating" />}
      </div>

      <EntryList
        items={(() => {
          let chapterCounter = 0;
          return (entries ?? []).map((entry) => ({
            id: entry.id,
            kind: entry.kind ?? "entry",
            authorId: entry.character_id,
            mentionedIds: entry.kind === "chapter" ? [] : parseMentionedCharacterIdsFromHtml(entry.content),
            node: (
              <StoryEntryItem
                entry={entry}
                storyPostId={storyPost.id}
                canManage={myCharacterIds.has(entry.character_id)}
                mentionCharacters={mentionableCharacters}
                chapterNumber={entry.kind === "chapter" ? ++chapterCounter : undefined}
                displayHtml={entry.kind === "chapter" || entry.roll_label ? undefined : link(entry.content)}
                calendar={calendar}
                canEditChapter={entry.kind === "chapter" && (myCharacterIds.has(entry.character_id) || isAuthor || isWorldOwner)}
                canMark={entry.kind !== "chapter" && (myCharacterIds.size > 0 || isWorldOwner)}
                markedEvent={markedByEntry.get(entry.id) ?? null}
                eventType={eventType}
                sceneDate={datesFromRow(storyPost).start}
              />
            ),
          }));
        })()}
        characters={filterCharacters}
        storyPostId={storyPost.id}
        myCharacterIds={Array.from(myCharacterIds)}
        mentionCharacters={mentionableCharacters}
      />

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
        <p className="text-sm text-muted">
          Diese Szene ist abgeschlossen – keine neuen Fortsetzungen möglich.
          {nextScene && (
            <>
              {" "}
              <Link href={`/story/${nextScene.id}`} className="text-accent hover:underline">
                Weiter mit „{nextScene.title}“
              </Link>
            </>
          )}
        </p>
      ) : (
        <div data-tour="story-composer">
          <StoryComposer
            storyPostId={storyPost.id}
            worldId={storyPost.world_id}
            ownCharacters={ownCharacters}
            activeCharacterId={activeCharacter?.id ?? null}
            characters={mentionableCharacters}
            participantIds={participantIds}
            calendar={calendar}
            locations={locations}
            sceneLocation={storyPost.location}
            userId={user.id}
            startInChat={chatParam === "1"}
          />
        </div>
      )}
      </ClipSelectionProvider>
    </div>
    </div>
  );
}
