import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getWorldRights } from "@/lib/world-rights";
import { canEditWikiPage } from "@/lib/world-permissions";
import { sanitizePostHtml } from "@/lib/sanitize";
import { stripHtml } from "@/lib/strip-html";
import { formatDateTime } from "@/lib/format";
import { RestoreVersionButton } from "./restore-version-button";

export const metadata = { title: "Verlauf" };

type Version = {
  id: string;
  saved_by: string | null;
  saved_at: string;
  replaced_at: string;
  title: string;
  lead: string | null;
  content: string;
  fields: { icon: string; title: string; text: string }[];
};

// Frühere Fassungen einer Wiki-Seite (der Stand vor jeder Bearbeitung), mit „Wiederherstellen“
export default async function WikiHistoryPage({ params }: PageProps<"/wiki/[id]/verlauf">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: page } = await supabase.from("wiki_pages").select("id, world_id, title, created_by, updated_by, updated_at").eq("id", id).maybeSingle<{ id: string; world_id: string; title: string; created_by: string; updated_by: string | null; updated_at: string }>();
  if (!page) notFound();
  const canEdit = canEditWikiPage(await getWorldRights(page.world_id, user.id), page.created_by, user.id);

  const { data: versions } = await supabase
    .from("wiki_page_versions")
    .select("id, saved_by, saved_at, replaced_at, title, lead, content, fields")
    .eq("page_id", id)
    .order("replaced_at", { ascending: false })
    .limit(60)
    .returns<Version[]>();
  const list = versions ?? [];
  const ids = [...new Set([...list.map((v) => v.saved_by), page.updated_by ?? page.created_by].filter((x): x is string => !!x))];
  const { data: people } = ids.length ? await supabase.from("profiles").select("id, username, nickname").in("id", ids).returns<{ id: string; username: string; nickname: string | null }[]>() : { data: [] };
  const nameOf = (uid: string | null) => {
    const p = (people ?? []).find((x) => x.id === uid);
    return p ? (p.nickname || p.username) : "Unbekannt";
  };

  return (
    <div className="flex flex-col gap-6">
      <Link href={`/wiki/${id}`} className="flex w-fit items-center gap-1 text-sm text-muted transition hover:text-fg">
        <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        Zur Seite
      </Link>
      <div>
        <h1 className="font-serif text-4xl text-fg">Verlauf</h1>
        <p className="mt-1 text-fg-soft">{page.title}</p>
      </div>

      <section aria-label="Jetziger Stand" className="rounded-2xl border border-line bg-surface p-4">
        <p className="text-sm font-medium text-fg">Jetziger Stand</p>
        <p className="text-xs text-muted">
          {formatDateTime(page.updated_at)} von {nameOf(page.updated_by ?? page.created_by)}
        </p>
      </section>

      {list.length === 0 ? (
        <p className="text-muted">Noch keine früheren Fassungen. Sie entstehen, sobald die Seite bearbeitet wird.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {list.map((v) => {
            const text = stripHtml(v.content).trim();
            return (
              <li key={v.id}>
                <details className="group rounded-2xl border border-line bg-surface">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-fg">{v.title}</span>
                      <span className="block text-xs text-muted">
                        Stand vom {formatDateTime(v.saved_at)} von {nameOf(v.saved_by)} · ersetzt am {formatDateTime(v.replaced_at)}
                      </span>
                    </span>
                    <span className="text-xs text-muted">{text.length} Zeichen</span>
                  </summary>
                  <div className="flex flex-col gap-3 border-t border-line px-4 py-3">
                    {v.lead && <p className="font-serif italic text-fg-soft">{v.lead}</p>}
                    {text ? <div className="post-content wiki-prose min-w-0" dangerouslySetInnerHTML={{ __html: sanitizePostHtml(v.content) }} /> : <p className="text-muted">Kein Text.</p>}
                    {v.fields.length > 0 && (
                      <dl className="grid gap-1 text-sm">
                        {v.fields.map((f, i) => (
                          <div key={i} className="flex gap-2">
                            <dt className="shrink-0 text-muted">{f.title}:</dt>
                            <dd className="min-w-0 break-words text-fg">{f.text}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    {canEdit && <RestoreVersionButton pageId={id} versionId={v.id} />}
                  </div>
                </details>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
