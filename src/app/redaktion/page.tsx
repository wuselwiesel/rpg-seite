import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchRedaktionPage } from "@/lib/redaktion-feed";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { SearchFilterBar } from "@/components/search-filter-bar";
import { RedaktionFeedList } from "./redaktion-feed-list";
import { RedaktionSidebar } from "./redaktion-sidebar";

export default async function RedaktionPage({ searchParams }: PageProps<"/redaktion">) {
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

  const filters = { q, from, to, tag };
  const initialPosts = await fetchRedaktionPage(filters);

  return (
    <PullToRefresh>
      <div className="flex gap-8 px-3 pb-4 pt-2 sm:px-6 sm:py-8 lg:px-10">
        <div className="mx-auto min-w-0 max-w-[470px] xl:max-w-[540px] 2xl:max-w-[600px] flex-1">
          <div className="relative">
            <div className="mb-3 h-[44px]" />
            <SearchFilterBar basePath="/redaktion" q={q} from={from} to={to} tag={tag} iconOnly />
          </div>

          <RedaktionFeedList
            initialPosts={initialPosts}
            filters={filters}
            currentUserId={user.id}
            emptyState={
              q || tag || from || to ? (
                <p className="text-muted">Keine Beiträge gefunden.</p>
              ) : (
                <p className="text-muted">
                  Noch nichts in der Redaktion.{" "}
                  <Link href="/redaktion/new" className="text-accent hover:underline">
                    Starte den ersten Beitrag
                  </Link>
                  .
                </p>
              )
            }
          />
        </div>

        <aside className="hidden w-48 shrink-0 xl:block">
          <Suspense fallback={null}>
            <RedaktionSidebar userId={user.id} />
          </Suspense>
        </aside>
      </div>
    </PullToRefresh>
  );
}
