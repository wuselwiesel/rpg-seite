import { BadgeRow } from "@/components/badge-row";
import { getAccountBadges, syncAccountBadges } from "@/lib/badges-server";
import { EmojiText } from "@/components/custom-emoji-provider";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAcceptedFriends } from "@/lib/friends";
import { ProfileThemeWrapper } from "@/components/profile-theme-wrapper";
import { formatDate } from "@/lib/format";
import { fetchRedaktionPage } from "@/lib/redaktion-feed";
import { ProfilePosts } from "./profile-posts";
import type { Profile, RedaktionProfile } from "@/lib/types";

export default async function RedaktionProfilePage({ params }: PageProps<"/redaktion/profil/[userId]">) {
  const { userId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle<Profile>();
  if (!profile) notFound();

  const isOwn = userId === user.id;

  const [{ data: redProfile }, posts, friends] = await Promise.all([
    supabase.from("redaktion_profiles").select("*").eq("user_id", userId).maybeSingle<RedaktionProfile>(),
    fetchRedaktionPage({}, undefined, { authorId: userId, limit: 60 }),
    isOwn ? getAcceptedFriends(userId) : Promise.resolve(null),
  ]);

  if (isOwn) await syncAccountBadges();
  const badges = (await getAccountBadges(userId)).filter((b) => b.kind === "account");
  const displayName = profile.nickname || profile.username;
  const fields = redProfile?.custom_fields ?? [];

  return (
    <ProfileThemeWrapper
      theme={{ font: redProfile?.theme_font, accent: redProfile?.theme_accent, bg: redProfile?.theme_bg }}
    >
      <div className="mx-auto max-w-[935px] pb-10 sm:px-4 sm:pt-6">
        <div className="h-32 overflow-hidden bg-gradient-to-br from-accent/40 to-accent-strong/40 sm:h-52 sm:rounded-2xl">
          {redProfile?.banner_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={redProfile.banner_url} alt="" className="h-full w-full object-cover" />
          )}
        </div>

        <header className="px-4 sm:px-6">
          <div className="-mt-10 flex items-end gap-4 sm:-mt-14">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-app bg-surface-2 sm:h-28 sm:w-28">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-semibold text-muted sm:text-5xl">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            {isOwn && (
              <div className="ml-auto flex shrink-0 gap-2 pb-1">
                <Link
                  href="/redaktion/profil/bearbeiten"
                  className="flex items-center gap-1.5 rounded-lg bg-surface-2 px-4 py-1.5 text-sm font-semibold text-fg transition hover:bg-surface-3"
                >
                  <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                  Profil bearbeiten
                </Link>
              </div>
            )}
          </div>

          <h1 className="mt-3 truncate text-xl font-semibold text-fg sm:text-2xl">{displayName}</h1>
          <p className="text-sm text-muted">
            @{profile.username} · dabei seit {formatDate(profile.created_at.slice(0, 10))}
          </p>

          <ul className="mt-4 flex gap-6 text-sm text-fg-soft">
            <li>
              <span className="font-semibold text-fg">{posts.length}</span> Beiträge
            </li>
            {friends && (
              <li>
                <span className="font-semibold text-fg">{friends.length}</span> Freund:innen
              </li>
            )}
          </ul>

          {redProfile?.status_text && (
            <p className="mt-3 inline-block rounded-full bg-surface-2 px-3 py-1 text-sm text-fg-soft">
              <EmojiText text={redProfile.status_text} />
            </p>
          )}

          {redProfile?.bio && (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-fg">
              <EmojiText text={redProfile.bio} />
            </p>
          )}

          {fields.length > 0 && (
            <dl className="mt-4 grid gap-2 sm:grid-cols-2">
              {fields.map((f, i) => (
                <div key={i} className="rounded-xl bg-surface-2 px-3 py-2.5">
                  <dt className="flex items-center gap-1.5 text-xs font-medium text-muted">
                    {f.icon && <EmojiText text={f.icon} />}
                    {f.title}
                  </dt>
                  <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm text-fg">
                    <EmojiText text={f.text} />
                  </dd>
                </div>
              ))}
            </dl>
          )}

          <BadgeRow badges={badges} />
        </header>

        <div className="mt-6">
          {posts.length === 0 ? (
            <p className="mx-4 rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
              {isOwn ? "Du hast hier noch nichts gepostet." : "Noch nichts zu sehen."}
            </p>
          ) : (
            <ProfilePosts posts={posts} pinnedIds={redProfile?.pinned_post_ids ?? []} currentUserId={user.id} />
          )}
        </div>
      </div>
    </ProfileThemeWrapper>
  );
}
