import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveCharacter } from "@/lib/active-character";
import { getActiveWorld } from "@/lib/worlds";
import { FeedList } from "@/components/feed-list";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { fetchFeedPage } from "@/lib/feed";
import { StoriesStrip } from "@/components/stories-strip";
import { FeedSidebar } from "@/components/feed-sidebar";
import { SearchFilterBar } from "@/components/search-filter-bar";

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
  if (!activeWorld) redirect("/worlds");

  const activeCharacter = await getActiveCharacter(user.id, activeWorld.id);
  if (!activeCharacter) redirect("/characters/new");

  const filters = { q, from, to, tag };
  const initialPosts = await fetchFeedPage(filters, activeCharacter.id, activeWorld.id);

  return (
    <PullToRefresh>
    <div className="flex gap-8 px-3 pb-4 pt-2 sm:px-6 sm:py-8 lg:px-10">
      <div className="mx-auto min-w-0 max-w-[470px] flex-1">
        <div className="relative">
          <Suspense fallback={<div className="mb-3 h-[84px]" />}>
            <StoriesStrip worldId={activeWorld.id} activeCharacterId={activeCharacter.id} />
          </Suspense>
          <SearchFilterBar basePath="/" q={q} from={from} to={to} tag={tag} iconOnly />
        </div>

        <FeedList
          initialPosts={initialPosts}
          filters={filters}
          activeCharacterId={activeCharacter.id}
          emptyState={
            q || tag || from || to ? (
              <p className="text-muted">Keine Einträge gefunden.</p>
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

      <aside className="hidden w-48 shrink-0 xl:block">
        <Suspense fallback={null}>
          <FeedSidebar userId={user.id} worldId={activeWorld.id} />
        </Suspense>
      </aside>
    </div>
    </PullToRefresh>
  );
}
