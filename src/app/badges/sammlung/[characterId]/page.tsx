import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AUTO_BADGES, CHARACTER_CATEGORIES } from "@/lib/badges";
import { characterMetrics, getCharacterBadges, syncCharacterBadges, visibleBadges } from "@/lib/badges-server";
import { BadgeFilterTabs, BadgeSections, FocusedBadge, SpecialBadges } from "@/components/badge-sections";
import { BadgeCollectionHeader } from "@/components/badge-collection-header";

export default async function CharacterBadgeCollectionPage({ params, searchParams }: PageProps<"/badges/sammlung/[characterId]">) {
  const { characterId } = await params;
  const sp = await searchParams;
  const focusKey = Array.isArray(sp.badge) ? sp.badge[0] : sp.badge;
  const showAll = (Array.isArray(sp.zeige) ? sp.zeige[0] : sp.zeige) === "alle";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: character } = await supabase
    .from("characters")
    .select("id, name, avatar_url, owner_id")
    .eq("id", characterId)
    .maybeSingle();
  if (!character) notFound();

  const isOwn = character.owner_id === user.id;
  if (isOwn) await syncCharacterBadges(character.id);
  const [badges, metrics] = await Promise.all([
    getCharacterBadges(character.id).then((b) => (isOwn ? b : visibleBadges(b))),
    isOwn ? characterMetrics(supabase, character.id) : Promise.resolve(undefined),
  ]);

  const defs = AUTO_BADGES.filter((b) => b.scope === "character");
  const autoEarned = badges.filter((b) => b.kind === "auto");
  const special = badges.filter((b) => b.kind === "custom");

  return (
    <div className="mx-auto max-w-3xl xl:max-w-4xl px-4 py-8 sm:py-10">
      <BadgeCollectionHeader
        name={character.name}
        avatarUrl={character.avatar_url}
        profileHref={`/characters/${character.id}`}
        profileLabel="Zum Profil"
        title="Badge-Sammlung"
        done={autoEarned.length}
        total={defs.length}
        extra={special.length}
      />
      <FocusedBadge badge={badges.find((b) => b.key === focusKey)} defs={defs} />
      <BadgeFilterTabs basePath={`/badges/sammlung/${character.id}`} showAll={showAll} earned={autoEarned.length + special.length} total={defs.length + special.length} />
      <SpecialBadges badges={special} />
      <BadgeSections defs={defs} categories={CHARACTER_CATEGORIES} earned={autoEarned} metrics={metrics} showAll={showAll} />
    </div>
  );
}
