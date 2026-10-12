import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { previewHtml } from "@/lib/world-preview";

type Row = { id: string; world_id: string; title: string; page_type: string | null; lead: string | null; content: string; cover_image_url: string | null };

export default async function PreviewWikiPage({ params }: { params: Promise<{ id: string; pageId: string }> }) {
  const { id, pageId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase.rpc("world_preview_wiki_page", { p_page: pageId });
  const page = ((data ?? []) as Row[])[0];
  if (!page || page.world_id !== id) notFound();

  return (
    <article className="mx-auto max-w-2xl px-4 py-10 xl:max-w-3xl">
      <Link href={`/worlds/${id}/vorschau?tab=wiki`} className="mb-4 flex w-fit items-center gap-1 text-sm text-muted transition hover:text-fg">
        <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        Wiki
      </Link>
      <h1 className="font-serif text-4xl leading-tight text-fg">{page.title}</h1>
      {page.lead && <p className="mt-3 font-serif text-xl italic text-fg-soft">{page.lead}</p>}
      {page.cover_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img loading="lazy" decoding="async" src={page.cover_image_url} alt={page.title} className="mt-6 max-h-96 w-auto max-w-full rounded-2xl bg-surface-2 object-cover" />
      )}
      <div className="post-content wiki-prose mt-6 min-w-0" dangerouslySetInnerHTML={{ __html: previewHtml(page.content) }} />
    </article>
  );
}
