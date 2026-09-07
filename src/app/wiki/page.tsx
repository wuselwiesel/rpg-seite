import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { stripHtml } from "@/lib/strip-html";
import type { WikiCategory, WikiPage } from "@/lib/types";

const CATEGORY_LABELS: Record<WikiCategory, string> = {
  ort: "Orte",
  npc: "NPCs",
  fraktion: "Fraktionen",
  sonstiges: "Sonstiges",
};

export default async function WikiListPage({ searchParams }: PageProps<"/wiki">) {
  const params = await searchParams;
  const category = typeof params.category === "string" ? params.category : "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const activeWorld = await getActiveWorld(user.id);
  if (!activeWorld) redirect("/worlds");

  let query = supabase
    .from("wiki_pages")
    .select("*")
    .eq("world_id", activeWorld.id)
    .order("title");

  if (category) query = query.eq("category", category);

  const { data: pages } = await query.returns<WikiPage[]>();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-1 flex items-center gap-2">
        <BookOpen className="h-6 w-6 text-accent" strokeWidth={2} />
        <h1 className="font-serif text-3xl text-fg">Wiki</h1>
      </div>
      <p className="mb-6 text-sm text-muted">
        Orte, NPCs und Fraktionen von {activeWorld.name}.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          href="/wiki"
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            !category ? "bg-accent-strong text-on-accent-strong" : "bg-surface-2 text-fg-soft hover:text-fg"
          }`}
        >
          Alle
        </Link>
        {(Object.keys(CATEGORY_LABELS) as WikiCategory[]).map((c) => (
          <Link
            key={c}
            href={`/wiki?category=${c}`}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              category === c ? "bg-accent-strong text-on-accent-strong" : "bg-surface-2 text-fg-soft hover:text-fg"
            }`}
          >
            {CATEGORY_LABELS[c]}
          </Link>
        ))}
      </div>

      <Link
        href="/wiki/new"
        className="mb-6 flex items-center justify-center gap-2 rounded-xl border border-dashed border-line px-4 py-3 text-sm text-muted transition hover:border-accent hover:text-accent"
      >
        + Neuer Wiki-Eintrag
      </Link>

      <div className="flex flex-col gap-3">
        {pages?.length ? (
          pages.map((page) => (
            <Link
              key={page.id}
              href={`/wiki/${page.id}`}
              className="block rounded-xl bg-surface-2 p-4 transition hover:bg-surface-3"
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded-full bg-surface-3 px-2 py-0.5 text-xs text-fg-soft">
                  {CATEGORY_LABELS[page.category]}
                </span>
                <h2 className="font-serif text-lg text-fg">{page.title}</h2>
              </div>
              {stripHtml(page.content) && (
                <p className="line-clamp-2 text-sm text-fg-soft">{stripHtml(page.content)}</p>
              )}
            </Link>
          ))
        ) : (
          <p className="text-muted">
            Noch keine Einträge.{" "}
            <Link href="/wiki/new" className="text-accent hover:underline">
              Leg den ersten an.
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
