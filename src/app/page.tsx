import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveCharacter, getOwnCharacters } from "@/lib/active-character";
import { getActiveWorld, getWorldJoinedAt } from "@/lib/worlds";
import { FeedList } from "@/components/feed-list";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { fetchFeedPage } from "@/lib/feed";
import { StoriesStrip } from "@/components/stories-strip";
import { SearchFilterBar } from "@/components/search-filter-bar";
import { WorldOnboarding } from "@/components/world-onboarding";
import { FirstSteps, type FirstStep } from "@/components/first-steps";
import { TourOffer } from "@/components/tour-offer";
import { NoCharacterBanner } from "@/components/no-character-banner";

export const metadata = { title: "Feed · Wortwinkel" };

export default async function FeedPage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const from = typeof params.from === "string" ? params.from : "";
  const to = typeof params.to === "string" ? params.to : "";
  const tag = typeof params.tag === "string" ? params.tag.trim().toLowerCase() : "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const activeWorld = await getActiveWorld(user.id);
  if (!activeWorld) redirect("/willkommen");

  const joinedAt = await getWorldJoinedAt(user.id, activeWorld.id);
  const recentlyJoined = !!joinedAt && new Date().getTime() - new Date(joinedAt).getTime() < 48 * 60 * 60 * 1000;

  const activeCharacter = await getActiveCharacter(user.id, activeWorld.id);
  // Ohne Charakter darf man die Welt erkunden (nur lesen)
  const noCharacter = !activeCharacter;

  const filters = { q, from, to, tag };
  const [initialPosts, ownCharacters] = await Promise.all([
    fetchFeedPage(filters, activeCharacter?.id ?? "", activeWorld.id),
    getOwnCharacters(user.id, activeWorld.id),
  ]);
  const myCharacters = ownCharacters.map((c) => ({ id: c.id, name: c.name, avatar_url: c.avatar_url }));

  // Erste Schritte: nur für Mitglieder, die in den letzten 30 Tagen beigetreten sind; hakt sich aus den Daten selbst ab
  const newcomer = !!joinedAt && new Date().getTime() - new Date(joinedAt).getTime() < 30 * 24 * 60 * 60 * 1000;
  let firstSteps: FirstStep[] = [];
  if (newcomer && activeCharacter) {
    const ownIds = ownCharacters.map((c) => c.id);
    const [{ count: postCount }, { count: sceneCount }, { count: entryCount }] = await Promise.all([
      supabase.from("posts").select("id", { count: "exact", head: true }).in("character_id", ownIds),
      supabase.from("story_posts").select("id", { count: "exact", head: true }).in("character_id", ownIds),
      supabase.from("story_entries").select("id", { count: "exact", head: true }).in("character_id", ownIds),
    ]);
    firstSteps = [
      { id: "character", label: "Charakter erstellt", href: `/characters/${activeCharacter.id}`, done: true },
      { id: "avatar", label: "Profilbild hinzufügen", href: `/characters/${activeCharacter.id}/edit`, done: !!activeCharacter.avatar_url },
      { id: "post", label: "Ersten Beitrag schreiben", href: "/posts/new", done: (postCount ?? 0) > 0 },
      { id: "scene", label: "In einer Szene mitschreiben", href: "/story", done: (sceneCount ?? 0) + (entryCount ?? 0) > 0 },
    ];
  }

  return (
    <PullToRefresh>
    <div className="flex gap-8 px-3 pb-4 pt-2 sm:px-6 sm:py-8 lg:px-10">
      <div className="mx-auto min-w-0 max-w-[470px] xl:max-w-[540px] 2xl:max-w-[600px] flex-1">
        <h1 className="sr-only">Feed</h1>
        <TourOffer enabled={recentlyJoined} />
        <WorldOnboarding worldId={activeWorld.id} worldName={activeWorld.name} autoOpen={false} />
        {noCharacter && <NoCharacterBanner worldId={activeWorld.id} className="mb-4" />}
        {firstSteps.length > 0 && <FirstSteps worldId={activeWorld.id} steps={firstSteps} />}

        {/* Mindesthöhe: der Filterknopf sitzt oben rechts und darf nie über dem ersten Beitrag liegen, auch wenn es keine Stories gibt */}
        <div className="relative min-h-11">
          {activeCharacter && (
            <Suspense fallback={<div className="mb-3 h-[84px]" />}>
              <StoriesStrip worldId={activeWorld.id} activeCharacterId={activeCharacter.id} />
            </Suspense>
          )}
          <SearchFilterBar basePath="/" q={q} from={from} to={to} tag={tag} iconOnly />
        </div>

        <FeedList
          initialPosts={initialPosts}
          filters={filters}
          activeCharacterId={activeCharacter?.id ?? ""}
          readOnly={noCharacter}
          myCharacters={myCharacters}
          emptyState={
            q || tag || from || to ? (
              <p className="text-muted">Keine Einträge gefunden.</p>
            ) : noCharacter ? (
              <p className="text-muted">Noch keine Einträge in dieser Welt.</p>
            ) : (
              <p className="text-muted">
                Noch keine Einträge. Sei die*der Erste und{" "}
                <Link href="/posts/new" className="text-accent hover:underline">
                  schreib etwas
                </Link>
                .
              </p>
            )
          }
        />
      </div>
    </div>
    </PullToRefresh>
  );
}
