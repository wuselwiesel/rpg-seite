import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { sanitizePostHtml } from "@/lib/sanitize";
import { autolinkHtml } from "@/lib/autolink";
import { getWikiTerms } from "@/lib/wiki-terms";
import { formatDateTime } from "@/lib/format";
import type { WikiCategory, WikiPage } from "@/lib/types";
import { DeleteWikiPageButton } from "./delete-wiki-page-button";

const CATEGORY_LABELS: Record<WikiCategory, string> = {
  ort: "Ort",
  npc: "NPC",
  fraktion: "Fraktion",
  sonstiges: "Sonstiges",
};

export default async function WikiPageDetailPage({ params }: PageProps<"/wiki/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: page } = await supabase
    .from("wiki_pages")
    .select("*")
    .eq("id", id)
    .maybeSingle<WikiPage>();

  if (!page) notFound();

  const { data: world } = await supabase
    .from("worlds")
    .select("created_by")
    .eq("id", page.world_id)
    .maybeSingle();
  const wikiTerms = await getWikiTerms(page.world_id);
  const canManage = page.created_by === user.id || world?.created_by === user.id;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/wiki" className="mb-4 inline-block text-xs text-muted hover:text-fg-soft">
        ← Zum Wiki
      </Link>

      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="rounded-full bg-surface-3 px-2.5 py-0.5 text-xs text-fg-soft">
          {CATEGORY_LABELS[page.category]}
        </span>
        {canManage && (
          <div className="flex items-center gap-1">
            <Link
              href={`/wiki/${page.id}/edit`}
              title="Bearbeiten"
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg"
            >
              <Pencil className="h-4 w-4" strokeWidth={2} />
            </Link>
            <DeleteWikiPageButton wikiPageId={page.id} />
          </div>
        )}
      </div>

      <h1 className="mb-1 font-serif text-3xl text-fg">{page.title}</h1>
      <p className="mb-4 text-xs text-muted">Zuletzt bearbeitet am {formatDateTime(page.updated_at)}</p>

      <div
        className="post-content text-fg-soft"
        dangerouslySetInnerHTML={{ __html: autolinkHtml(sanitizePostHtml(page.content), { wiki: wikiTerms, excludeWikiId: page.id }) }}
      />
    </div>
  );
}
