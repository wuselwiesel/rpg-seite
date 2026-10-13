import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { WorldCover } from "@/components/world-cover";
import { CharacterAvatar } from "@/components/character-avatar";
import { WikiTile } from "@/components/wiki-tile";
import { stripHtml } from "@/lib/strip-html";
import { timeAgoShort } from "@/lib/format";
import { previewHtml, type WorldPreviewInfo } from "@/lib/world-preview";
import { JoinOrRequestButton } from "../../join-or-request-button";
import { EnterWorldButton } from "../../enter-world-button";

export const metadata = { title: "Welt erkunden" };

type Tab = "info" | "wiki" | "figuren" | "szenen";
type WikiRow = { id: string; title: string; page_type: string | null; lead: string | null; cover_image_url: string | null; icon_url: string | null };
type CharRow = { id: string; name: string; avatar_url: string | null; bio: string | null; is_npc: boolean };
type SceneRow = { id: string; title: string; content: string; author_name: string | null; created_at: string; entry_count: number; location: string | null };

// Eine Welt ansehen, bevor man beitritt: nur lesen, nur was die Welt freigibt (Einstellung „Erkunden“).
export default async function WorldPreviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/worlds/${id}/vorschau`)}`);

  const { data: infoRows } = await supabase.rpc("world_preview_info", { p_world: id });
  const info = ((infoRows ?? []) as WorldPreviewInfo[])[0];
  if (!info) notFound();

  const wanted = typeof sp.tab === "string" ? sp.tab : "info";
  const tab: Tab = wanted === "wiki" || wanted === "figuren" || (wanted === "szenen" && info.preview === "full") ? wanted : "info";

  const [wiki, characters, scenes] = await Promise.all([
    tab === "wiki" ? supabase.rpc("world_preview_wiki", { p_world: id }) : Promise.resolve({ data: [] }),
    tab === "figuren" ? supabase.rpc("world_preview_characters", { p_world: id }) : Promise.resolve({ data: [] }),
    tab === "szenen" ? supabase.rpc("world_preview_scenes", { p_world: id }) : Promise.resolve({ data: [] }),
  ]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "info", label: "Willkommen" },
    { key: "wiki", label: "Wiki" },
    { key: "figuren", label: "Figuren" },
    ...(info.preview === "full" ? [{ key: "szenen" as Tab, label: "Szenen" }] : []),
  ];
  const welcome = info.welcome_html ? previewHtml(info.welcome_html) : "";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 xl:max-w-3xl 2xl:max-w-4xl">
      <Link href="/worlds/entdecken" className="mb-4 flex w-fit items-center gap-1 text-sm text-muted transition hover:text-fg">
        <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        Welten entdecken
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-center gap-4">
          <WorldCover name={info.name} coverUrl={info.cover_image_url} className="h-16 w-16 shrink-0 text-lg" />
          <div className="min-w-0">
            <h1 className="truncate font-serif text-3xl text-fg">{info.name}</h1>
            <p className="text-xs text-muted">
              {info.member_count} {info.member_count === 1 ? "Mitglied" : "Mitglieder"}
            </p>
          </div>
        </div>
        {info.is_member ? (
          <EnterWorldButton worldId={info.id} />
        ) : (
          <JoinOrRequestButton worldId={info.id} joinMode={info.join_mode} hasRequest={info.has_request} ownerId={info.created_by} />
        )}
      </div>

      <nav aria-label="Bereiche" className="mb-6 flex gap-1 overflow-x-auto rounded-lg bg-surface-2 p-1">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/worlds/${id}/vorschau?tab=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition ${tab === t.key ? "bg-surface text-fg" : "text-muted hover:text-fg-soft"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "info" && (
        <section aria-label="Willkommen" className="flex flex-col gap-4">
          {info.description && <p className="text-fg-soft">{info.description}</p>}
          {welcome && stripHtml(welcome) && (
            <div className="rounded-2xl border border-line bg-surface p-5">
              <div className="post-content text-[15.5px] leading-[1.75] text-fg" dangerouslySetInnerHTML={{ __html: welcome }} />
            </div>
          )}
        </section>
      )}

      {tab === "wiki" && (
        <ul className="flex flex-col gap-2">
          {((wiki.data ?? []) as WikiRow[]).length === 0 && <li className="text-sm text-muted">Noch keine Wiki-Seiten.</li>}
          {((wiki.data ?? []) as WikiRow[]).map((p) => (
            <li key={p.id}>
              <Link href={`/worlds/${id}/vorschau/wiki/${p.id}`} className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 transition hover:bg-surface-2">
                <WikiTile id={p.id} title={p.title} cover={p.cover_image_url} icon={p.icon_url} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-fg">{p.title}</span>
                  {p.lead && <span className="block truncate text-sm text-muted">{p.lead}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {tab === "figuren" && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {((characters.data ?? []) as CharRow[]).length === 0 && <li className="text-sm text-muted">Noch keine Figuren.</li>}
          {((characters.data ?? []) as CharRow[]).map((c) => (
            <li key={c.id}>
              <Link href={`/worlds/${id}/vorschau/figur/${c.id}`} className="flex items-start gap-3 rounded-lg border border-line bg-surface px-4 py-3 transition hover:bg-surface-2">
                <CharacterAvatar name={c.name} avatarUrl={c.avatar_url} size={44} />
                <div className="min-w-0">
                  <p className="truncate font-medium text-fg">{c.name}</p>
                  {c.bio && <p className="line-clamp-2 text-sm text-muted">{c.bio}</p>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {tab === "szenen" && (
        <ul className="flex flex-col gap-3">
          {((scenes.data ?? []) as SceneRow[]).length === 0 && <li className="text-sm text-muted">Noch keine Szenen.</li>}
          {((scenes.data ?? []) as SceneRow[]).map((s) => (
            <li key={s.id}>
              <Link href={`/worlds/${id}/vorschau/szene/${s.id}`} className="block rounded-lg border border-line bg-surface px-4 py-3 transition hover:bg-surface-2">
                <p className="font-serif text-lg text-fg">{s.title}</p>
                <p className="line-clamp-2 text-sm text-fg-soft">{stripHtml(s.content)}</p>
                <p className="mt-1 text-xs text-muted">
                  {s.author_name ? `${s.author_name} · ` : ""}
                  {s.entry_count} {s.entry_count === 1 ? "Fortsetzung" : "Fortsetzungen"} · {timeAgoShort(s.created_at)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
