import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ACCOUNT_CATEGORIES, AUTO_BADGES } from "@/lib/badges";
import { accountMetrics, getAccountBadges, syncAccountBadges, visibleBadges } from "@/lib/badges-server";
import { BadgeFilterTabs, BadgeSections, FocusedBadge, SpecialBadges } from "@/components/badge-sections";
import { BadgeCollectionHeader } from "@/components/badge-collection-header";

export default async function AccountBadgeCollectionPage({ params, searchParams }: PageProps<"/badges/konto/[userId]">) {
  const { userId } = await params;
  const sp = await searchParams;
  const focusKey = Array.isArray(sp.badge) ? sp.badge[0] : sp.badge;
  const showAll = (Array.isArray(sp.zeige) ? sp.zeige[0] : sp.zeige) === "alle";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, nickname, avatar_url")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) notFound();

  const isOwn = userId === user.id;
  if (isOwn) await syncAccountBadges();
  const [badges, metrics] = await Promise.all([
    getAccountBadges(userId).then((b) => (isOwn ? b : visibleBadges(b))),
    isOwn ? accountMetrics(supabase, userId) : Promise.resolve(undefined),
  ]);
  const earned = badges.filter((b) => b.kind === "account");
  // Von Freund:innen verliehene Abzeichen
  const special = badges.filter((b) => b.kind === "custom");
  const defs = AUTO_BADGES.filter((b) => b.scope === "account");

  return (
    <div className="mx-auto max-w-3xl xl:max-w-4xl px-4 py-8 sm:py-10">
      <BadgeCollectionHeader
        name={profile.nickname || profile.username}
        avatarUrl={profile.avatar_url}
        profileHref={`/redaktion/profil/${userId}`}
        profileLabel="Zum Redaktions-Profil"
        title="Redaktions-Abzeichen"
        done={earned.length}
        total={defs.length}
        extra={special.length}
      />
      <FocusedBadge badge={badges.find((b) => b.key === focusKey)} defs={defs} />
      <BadgeFilterTabs basePath={`/badges/konto/${userId}`} showAll={showAll} earned={earned.length + special.length} total={defs.length + special.length} />
      <SpecialBadges badges={special} />
      <BadgeSections defs={defs} categories={ACCOUNT_CATEGORIES} earned={earned} metrics={metrics} showAll={showAll} />
    </div>
  );
}
