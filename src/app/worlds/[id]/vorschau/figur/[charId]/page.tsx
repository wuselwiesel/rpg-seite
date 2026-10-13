import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, IdCard, Images } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProfileThemeWrapper } from "@/components/profile-theme-wrapper";
import { Chabo } from "@/components/chabo/chabo";
import { normalizeSheet, stripSecrets } from "@/lib/sheet-rules";
import { DEFAULT_TALENTS, parseTalentConfig } from "@/lib/talents";
import { stripHtml } from "@/lib/strip-html";
import { JoinOrRequestButton } from "@/app/worlds/join-or-request-button";
import { EnterWorldButton } from "@/app/worlds/enter-world-button";
import type { WorldPreviewInfo } from "@/lib/world-preview";

export const metadata = { title: "Figur erkunden" };

type CharInfo = {
  id: string;
  world_id: string;
  name: string;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  is_npc: boolean;
  theme_font: string | null;
  theme_accent: string | null;
  theme_bg: string | null;
  post_count: number;
  follower_count: number;
  following_count: number;
  has_sheet: boolean;
  dice_enabled: boolean;
  preview: "none" | "info" | "full";
  talent_config: unknown;
};
type PostRow = { id: string; content: string; media_url: string | null; media_type: string | null; media_urls: string[] | null; created_at: string };

// Figur aus der Vorschau einer Welt: Profil, Beiträge (nur bei „alles“) und ChaBo, nur lesend und ohne Geheimes.
export default async function PreviewCharacterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; charId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id, charId } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/worlds/${id}/vorschau/figur/${charId}`)}`);

  const [{ data: charRows }, { data: worldRows }] = await Promise.all([
    supabase.rpc("world_preview_character", { p_char: charId }),
    supabase.rpc("world_preview_info", { p_world: id }),
  ]);
  const character = ((charRows ?? []) as CharInfo[])[0];
  const world = ((worldRows ?? []) as WorldPreviewInfo[])[0];
  if (!character || !world || character.world_id !== id) notFound();

  const showPosts = character.preview === "full";
  const wanted = typeof sp.tab === "string" ? sp.tab : "";
  const tab: "beitraege" | "chabo" = wanted === "chabo" && character.has_sheet ? "chabo" : wanted === "beitraege" && showPosts ? "beitraege" : showPosts ? "beitraege" : character.has_sheet ? "chabo" : "beitraege";

  let posts: PostRow[] = [];
  let sheetData = null;
  if (tab === "beitraege" && showPosts) {
    const { data } = await supabase.rpc("world_preview_character_posts", { p_char: charId });
    posts = (data ?? []) as PostRow[];
  }
  if (tab === "chabo" || character.has_sheet) {
    const { data } = await supabase.rpc("world_preview_character_sheet", { p_char: charId });
    if (data) {
      const talents = character.talent_config ? parseTalentConfig(character.talent_config) : DEFAULT_TALENTS;
      sheetData = stripSecrets(normalizeSheet(data, talents));
    }
  }

  const base = `/worlds/${id}/vorschau/figur/${charId}`;
  const tabs = [
    ...(showPosts ? [{ key: "beitraege" as const, label: "Beiträge", icon: Images }] : []),
    ...(character.has_sheet ? [{ key: "chabo" as const, label: "ChaBo", icon: IdCard }] : []),
  ];

  return (
    <ProfileThemeWrapper theme={{ font: character.theme_font, accent: character.theme_accent, bg: character.theme_bg }}>
      <div className="mx-auto max-w-[935px] px-4 pt-6 xl:max-w-[1040px]">
        <Link href={`/worlds/${id}/vorschau?tab=figuren`} className="mb-3 flex w-fit items-center gap-1 text-sm text-muted transition hover:text-fg">
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          {world.name}
        </Link>

        <div className="h-32 overflow-hidden rounded-2xl bg-gradient-to-br from-accent/40 to-accent-strong/40 sm:h-48">
          {character.banner_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img loading="lazy" decoding="async" src={character.banner_url} alt="" className="h-full w-full object-cover" />
          )}
        </div>

        <header className="px-2 sm:px-4">
          <div className="-mt-12 flex items-end justify-between gap-4 sm:-mt-16">
            <div className="h-[88px] w-[88px] shrink-0 overflow-hidden rounded-full border-4 border-app bg-surface-2 sm:h-[128px] sm:w-[128px]">
              {character.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img loading="lazy" decoding="async" src={character.avatar_url} alt={character.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-semibold sm:text-5xl">{character.name.charAt(0).toUpperCase()}</div>
              )}
            </div>
            <div className="pb-1">
              {world.is_member ? (
                <EnterWorldButton worldId={world.id} />
              ) : (
                <JoinOrRequestButton worldId={world.id} joinMode={world.join_mode} hasRequest={world.has_request} ownerId={world.created_by} />
              )}
            </div>
          </div>

          <h1 className="mt-3 font-serif text-3xl text-fg">{character.name}</h1>
          <p className="text-sm text-muted">
            {character.username ? `@${character.username} · ` : ""}in {world.name}
          </p>
          <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-fg-soft">
            {showPosts && (
              <span>
                <b className="font-semibold text-fg">{character.post_count}</b> Beiträge
              </span>
            )}
            <span>
              <b className="font-semibold text-fg">{character.follower_count}</b> Follower
            </span>
            <span>
              <b className="font-semibold text-fg">{character.following_count}</b> Gefolgt
            </span>
          </p>
          {character.bio && <p className="mt-3 whitespace-pre-line text-fg-soft">{character.bio}</p>}
        </header>

        {tabs.length > 0 && (
          <nav aria-label="Bereiche" className="mt-6 flex gap-1 border-b border-line">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <Link
                  key={t.key}
                  href={`${base}?tab=${t.key}`}
                  aria-current={tab === t.key ? "page" : undefined}
                  className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide transition ${
                    tab === t.key ? "border-fg text-fg" : "border-transparent text-muted hover:text-fg-soft"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                  {t.label}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="py-5">
          {tab === "chabo" && sheetData ? (
            <Chabo key={charId} diceEnabled={character.dice_enabled} characterId={charId} characterName={character.name} initial={sheetData} editable={false} variant="panel" />
          ) : tab === "beitraege" && showPosts ? (
            posts.length === 0 ? (
              <p className="text-muted">Noch keine Beiträge.</p>
            ) : (
              <ul className="grid grid-cols-3 gap-1">
                {posts.map((p) => {
                  const image = p.media_type === "image" ? (p.media_urls?.[0] ?? p.media_url) : null;
                  return (
                    <li key={p.id} className="relative aspect-square overflow-hidden bg-surface-2">
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img loading="lazy" decoding="async" src={image} alt="" className="h-full w-full object-cover" />
                      ) : p.media_type === "video" ? (
                        <div className="flex h-full w-full items-center justify-center bg-surface-3 text-xs text-muted">Video</div>
                      ) : (
                        <div className="flex h-full w-full items-center overflow-hidden bg-surface-3 p-2">
                          <p className="line-clamp-5 text-xs text-fg-soft">{stripHtml(p.content)}</p>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )
          ) : (
            <p className="text-muted">Hier gibt es noch nichts zu sehen.</p>
          )}
        </div>
      </div>
    </ProfileThemeWrapper>
  );
}
