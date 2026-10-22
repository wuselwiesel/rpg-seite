import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { SceneSummary } from "./scene-summary";
import { recapToHtml } from "@/lib/recap-html";
import { segmentsToPlain } from "@/lib/segments";
import { createClient } from "@/lib/supabase/server";
import { getActiveCharacter, getMentionableCharacters, getOwnCharacters, getOwnNpcs, getWorldCharacters } from "@/lib/active-character";
import { CharacterAvatar } from "@/components/character-avatar";
import { NarratorAvatar } from "@/components/narrator-avatar";
import { formatDateTime, timeAgoShort } from "@/lib/format";
import { stripHtml } from "@/lib/strip-html";
import { sanitizePostHtml } from "@/lib/sanitize";
import { autolinkHtml } from "@/lib/autolink";
import { parseMentionedCharacterIdsFromHtml } from "@/lib/mentions";
import { getWikiTerms } from "@/lib/wiki-terms";
import { findLocationPageId } from "@/lib/location-link";
import { getWikiCalendar } from "@/lib/wiki-calendar-data";
import { getWikiTypes } from "@/lib/wiki-data";
import { datesFromRow } from "@/lib/wiki-calendar";
import type { StoryEntry, StoryPost } from "@/lib/types";
import { SceneCast } from "./scene-cast";
import { SceneArc } from "./scene-arc";
import { StoryComposer } from "./story-composer";
import { StoryEntryItem } from "./story-entry-item";
import { EntryList } from "./entry-list";
import { TurnTitle } from "@/components/turn-title";
import { ClipSelectionProvider } from "./clip-selection";
import { SelectionToWiki } from "./selection-to-wiki";
import { ScrollToLast } from "./scroll-to-last";
import { ScrollToEntry } from "./scroll-to-entry";
import { JumpToLast, JumpToStart, JumpToStartFloating } from "./jump-to-last";
import { SceneSearch } from "./scene-search";
import { SceneNote } from "./scene-note";
import { TargetNotesButton } from "@/components/target-notes-button";
import { noteCountForTarget } from "@/lib/notes-data";
import { ChapterJump } from "./chapter-jump";
import { StoryPostControls } from "./story-post-controls";
import { SceneMeta } from "./scene-meta";
import type { SceneTrack } from "./scene-tracks";
import { StoryPostBody } from "./story-post-body";
import { TurnBanner } from "./turn-banner";
import { SceneRecap } from "./scene-recap";
import { SceneChain } from "./scene-chain";
import { SceneMarkFlag } from "./scene-mark-flag";
import { getWorldMembers } from "@/lib/world-members";
import { getActiveWorld, getUserWorlds } from "@/lib/worlds";
import { WorldSwitchRedirect } from "@/components/world-switch-redirect";

const ENTRY_WINDOW = 80;

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
    .select("*, characters!story_posts_character_id_fkey(*), story_arcs!arc_id(name)")
    .eq("id", id)
    .maybeSingle<StoryPost>();

  if (!storyPost) notFound();

  // Szene aus einer anderen Welt (z. B. über eine Benachrichtigung): erst in diese Welt wechseln, damit Seitenleiste und Charakter passen.
  const [userWorlds, currentWorld] = await Promise.all([getUserWorlds(user.id), getActiveWorld(user.id)]);
  if (currentWorld?.id !== storyPost.world_id && userWorlds.some((w) => w.id === storyPost.world_id)) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(await searchParams)) {
      for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, v);
    }
    const here = `/story/${id}${query.size > 0 ? `?${query.toString()}` : ""}`;
    return <WorldSwitchRedirect worldId={storyPost.world_id} path={here} />;
  }

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

  // Lange Szenen: zuerst nur die neuesten Beiträge (plus alle Kapitel); frühere lädt die Liste auf Wunsch nach.
  const ENTRIES_SELECT =
    "*, characters!story_entries_character_id_fkey(*), roll_target_character:roll_target_character_id(name)";
  const NOT_CHAPTER = "kind.is.null,kind.neq.chapter";
  const [{ data: recentRows }, { data: chapterRows }, { count: totalCount }, { count: writingTotal }, { data: writerRows }] =
    await Promise.all([
      supabase
        .from("story_entries")
        .select(ENTRIES_SELECT)
        .eq("story_post_id", id)
        .or(NOT_CHAPTER)
        .order("created_at", { ascending: false })
        .limit(ENTRY_WINDOW)
        .returns<StoryEntry[]>(),
      supabase
        .from("story_entries")
        .select(ENTRIES_SELECT)
        .eq("story_post_id", id)
        .eq("kind", "chapter")
        .order("created_at", { ascending: true })
        .returns<StoryEntry[]>(),
      supabase.from("story_entries").select("id", { count: "exact", head: true }).eq("story_post_id", id).or(NOT_CHAPTER),
      supabase
        .from("story_entries")
        .select("id", { count: "exact", head: true })
        .eq("story_post_id", id)
        .or(NOT_CHAPTER)
        .is("roll_label", null),
      supabase.from("story_entries").select("character_id").eq("story_post_id", id).limit(2000),
    ]);
  const recent = (recentRows ?? []).slice().reverse();
  const entries = [...recent, ...(chapterRows ?? [])].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  // Beiträge, die noch nicht geladen sind (ohne Kapitel), und der Zeitpunkt des ältesten geladenen
  const olderCount = Math.max(0, (totalCount ?? recent.length) - recent.length);
  const olderBefore = olderCount > 0 && recent.length > 0 ? recent[0].created_at : null;

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
    supabase.from("worlds").select("created_by, dice_enabled").eq("id", storyPost.world_id).maybeSingle<{ created_by: string; dice_enabled: boolean | null }>(),
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
  // Eigene Notiz zu dieser Szene (nur für dich)
  const { data: sceneNote } = await supabase
    .from("scene_notes")
    .select("body")
    .eq("story_post_id", id)
    .eq("user_id", user.id)
    .maybeSingle<{ body: string }>();
  const isAuthor = myCharacterIds.has(storyPost.character_id);

  // Musikliste der Szene (jede:r Mitspielende darf Titel hinzufügen; entfernen: wer ihn hinzugefügt hat, die Autor:in, Admins)
  const { data: trackRows } = await supabase
    .from("scene_tracks")
    .select("id, url, title, added_by")
    .eq("story_post_id", storyPost.id)
    .order("created_at")
    .returns<{ id: string; url: string; title: string | null; added_by: string }[]>();
  const memberName = new Map(worldMembers.map((m) => [m.id, m.name]));
  const { data: folderRows } = await supabase.from("story_folders").select("id, name, parent_id").eq("world_id", storyPost.world_id);
  const sceneFolders = (folderRows ?? []).map((f) => ({ id: f.id as string, name: f.name as string, parentId: f.parent_id as string | null }));
  const tracks: SceneTrack[] = (trackRows ?? []).map((t) => ({
    id: t.id,
    url: t.url,
    title: t.title,
    addedBy: t.added_by === user.id ? "dir" : (memberName.get(t.added_by) ?? "jemandem"),
    canRemove: t.added_by === user.id || isAuthor || isWorldOwner,
  }));

  const chapters = (entries ?? []).filter((e) => e.kind === "chapter");
  const lastChapter = chapters[chapters.length - 1] ?? null;
  const continuations = (entries ?? []).filter((e) => e.kind !== "chapter");
  const writing = continuations.filter((e) => !e.roll_label);
  const lastWriter = (entries ?? []).length ? entries![entries!.length - 1].characters : storyPost.characters;
  const participantIds = Array.from(
    new Set([storyPost.character_id, ...(writerRows ?? []).map((e) => e.character_id as string), ...(entries ?? []).map((e) => e.character_id)]),
  );
  const turnCharacter = storyPost.turn_character_id
    ? mentionableCharacters.find((c) => c.id === storyPost.turn_character_id) ?? null
    : null;
  const turnIsMine = !!turnCharacter && myCharacterIds.has(turnCharacter.id);
  // „Zuletzt geschah“: gebündelte Nachrichten erscheinen je Figur einzeln statt als ein langer Text der ersten Figur
  const recapItems = writing.flatMap((e) =>
    segmentsToPlain(e.content, e.kind === "narrator" ? "Erzähler:in" : (e.characters?.name ?? "?")).map((part, i) => ({
      id: `${e.id}:${i}`,
      name: part.name,
      text: part.text,
      at: e.created_at,
    })),
  );

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

  // „Mit dabei“: beim Anlegen der Szene eingetragene Charaktere
  const { data: castRows } = await supabase
    .from("story_post_cast")
    .select("characters(id, name, avatar_url)")
    .eq("story_post_id", id)
    .returns<{ characters: { id: string; name: string; avatar_url: string | null } | null }[]>();
  const cast = (castRows ?? []).map((r) => r.characters).filter((c): c is { id: string; name: string; avatar_url: string | null } => !!c);

  // Handlungsstränge dieser Szene (mehrere möglich; der erste steht auch in story_posts.arc_id)
  const { data: sceneArcRows } = await supabase
    .from("story_post_arcs")
    .select("arc_id, created_at, story_arcs(name)")
    .eq("story_post_id", id)
    .order("created_at")
    .returns<{ arc_id: string; created_at: string; story_arcs: { name: string } | null }[]>();
  const sceneArcs = (sceneArcRows ?? [])
    .filter((r) => r.story_arcs?.name)
    .map((r) => ({ id: r.arc_id, name: r.story_arcs!.name }))
    .sort((a, b) => (a.id === storyPost.arc_id ? -1 : b.id === storyPost.arc_id ? 1 : 0));

  // Handlungsstränge der Welt (nur für die, die den Strang ändern dürfen)
  const { data: arcRows } = isAuthor || isWorldOwner
    ? await supabase.from("story_arcs").select("id, name").eq("world_id", storyPost.world_id).order("name").returns<{ id: string; name: string }[]>()
    : { data: [] as { id: string; name: string }[] };
  const arcOptions = arcRows ?? [];

  // Auswahl für „Mit dabei“ (nur die Autor:in kann sie ändern): alle Charaktere der Welt; die Autor-Figur nur im Erzähler-Modus (sonst ist sie ohnehin dabei)
  const castOptions = isAuthor
    ? (await getWorldCharacters(user.id, storyPost.world_id)).filter((c) => c.id !== storyPost.character_id || !!storyPost.narrator).map((c) => ({ id: c.id, name: c.name, avatar_url: c.avatar_url }))
    : [];

  // Charaktere für den Filter: erst die eigenen, dann alle übrigen, die in der Szene schreiben oder erwähnt werden.
  const involvedIds = new Set<string>([storyPost.character_id, ...participantIds, ...cast.map((c) => c.id)]);
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
      <article className="group/scene mb-8 rounded-lg border border-line bg-surface p-6">
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
            <Link href={`/characters/${storyPost.character_id}/chabo`} aria-label={`ChaBo von ${storyPost.characters?.name ?? "Charakter"}`}>
              <CharacterAvatar
                name={storyPost.characters?.name ?? "?"}
                avatarUrl={storyPost.characters?.avatar_url}
              />
            </Link>
          )}
          <div>
            {storyPost.narrator ? (
              <p className="font-medium text-fg">Erzähler:in</p>
            ) : (
              <Link href={`/characters/${storyPost.character_id}/chabo`} className="font-medium text-fg transition hover:text-accent">
                {storyPost.characters?.name}
              </Link>
            )}
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
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 [&>*]:!mb-0" data-tour="scene-meta">
        <SceneChain
          storyPostId={storyPost.id}
          previous={prevScene ? { id: prevScene.id, title: prevScene.title } : null}
          next={nextScene ? { id: nextScene.id, title: nextScene.title } : null}
          options={chainOptions}
          canEdit={isAuthor || isWorldOwner}
        />
        <SceneArc
          storyPostId={storyPost.id}
          sceneArcs={sceneArcs}
          arcs={arcOptions}
          canEdit={myCharacterIds.size > 0 || isWorldOwner}
        />
        <SceneCast
          storyPostId={storyPost.id}
          cast={cast}
          options={castOptions}
          canEdit={isAuthor && !storyPost.locked}
        />
        </div>
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
                worldId={storyPost.world_id}
                folderId={(storyPost as { folder_id?: string | null }).folder_id ?? null}
                folders={sceneFolders}
                location={storyPost.location}
                locationWikiId={findLocationPageId(wikiTerms, storyPost.location)}
                inWorldTime={storyPost.in_world_time}
                dates={datesFromRow(storyPost)}
                calendar={calendar}
                shortSummary={storyPost.short_summary ?? null}
                ambienceImage={storyPost.ambience_image_url ?? null}
                tracks={tracks}
                canAddTracks={myCharacterIds.size > 0 || isWorldOwner}
                selfId={user.id}
                selfName={memberName.get(user.id) ?? "Jemand"}
                canEdit={myCharacterIds.size > 0 || isWorldOwner}
              />
            </>
          }
        />
      </article>

      {!storyPost.locked && <TurnTitle isMine={turnIsMine} title={storyPost.title} />}
      {turnCharacter && !storyPost.locked && (
        <TurnBanner
          storyPostId={storyPost.id}
          turnName={turnCharacter.name}
          waitingName={lastWriter && lastWriter.id !== turnCharacter.id ? lastWriter.name : null}
          isMine={turnIsMine}
        />
      )}

      <SceneNote storyPostId={storyPost.id} initial={sceneNote?.body ?? ""} notesButton={<TargetNotesButton kind="scene" targetId={storyPost.id} targetLabel={storyPost.title} count={await noteCountForTarget(supabase, user.id, "scene", storyPost.id)} />} />

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
        entryCount={writingTotal ?? writing.length}
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
          Fortsetzungen {(totalCount ?? continuations.length) ? `(${totalCount ?? continuations.length})` : ""}
        </h2>
        <div className="flex items-center gap-1">
          {(totalCount ?? 0) >= 6 && <SceneSearch storyPostId={storyPost.id} />}
          {(entries?.length ?? 0) > 5 && <JumpToStart />}
          {(entries?.length ?? 0) > 1 && <JumpToLast variant="inline" />}
        </div>
      </div>
      {/* Schwebende Sprungknöpfe in einer Reihe: Kapitel (nur Symbol) links von „Zur letzten Nachricht“ */}
      <div className="pointer-events-none fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-20 flex flex-col items-end gap-2 lg:bottom-6">
        {/* Pfeil nach oben über „Zur letzten Nachricht“, damit er in der Szene nichts verdeckt */}
        {(entries?.length ?? 0) > 5 && <JumpToStartFloating />}
        <div className="flex items-center gap-2">
          {chapters.length > 0 && <ChapterJump chapters={chapters.map((c, i) => ({ n: i + 1, title: c.chapter_title ?? c.content, label: c.chapter_label?.trim() || null }))} />}
          {(entries?.length ?? 0) > 1 && <JumpToLast variant="floating" />}
        </div>
      </div>

      <EntryList
        items={(() => {
          let chapterCounter = 0;
          return (entries ?? []).map((entry) => ({
            id: entry.id,
            kind: entry.kind ?? "entry",
            createdAt: entry.created_at,
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
                ownCharacters={ownCharacters}
              />
            ),
          }));
        })()}
        characters={filterCharacters}
        storyPostId={storyPost.id}
        olderCount={olderCount}
        olderBefore={olderBefore}
        myCharacterIds={Array.from(myCharacterIds)}
        mentionCharacters={mentionableCharacters}
        ownCharacters={ownCharacters}
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
            worldMembers={worldMembers}
            startInChat={chatParam === "1"}
            diceEnabled={world?.dice_enabled !== false}
          />
        </div>
      )}
        <SelectionToWiki sceneId={storyPost.id} />
      </ClipSelectionProvider>
    </div>
    </div>
  );
}
