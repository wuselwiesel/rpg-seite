import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { getActiveCharacter } from "@/lib/active-character";
import { getAccountBadges, getCharacterBadges } from "@/lib/badges-server";
import { FeaturedPicker, VisibilityList } from "../badge-controls";
export default async function ManageBadgesPage({ searchParams }: PageProps<"/badges/verwalten">) {
  const sp = await searchParams;
  const rawTab = Array.isArray(sp.bereich) ? sp.bereich[0] : sp.bereich;
  const tab: "charakter" | "account" = rawTab === "account" ? "account" : "charakter";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const world = await getActiveWorld(user.id);
  const character = world ? await getActiveCharacter(user.id, world.id) : null;

  const [charBadges, accBadges, featuredRows] = await Promise.all([
    character ? getCharacterBadges(character.id) : Promise.resolve([]),
    getAccountBadges(user.id),
    Promise.all([
      character
        ? supabase.from("characters").select("featured_badge_id").eq("id", character.id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("profiles").select("featured_badge_id").eq("id", user.id).maybeSingle(),
    ]),
  ]);
  const featuredChar = (featuredRows[0].data as { featured_badge_id: string | null } | null)?.featured_badge_id ?? null;
  const featuredAcc = (featuredRows[1].data as { featured_badge_id: string | null } | null)?.featured_badge_id ?? null;

  return (
    <div className="mx-auto max-w-2xl xl:max-w-3xl 2xl:max-w-4xl px-4 py-8 sm:py-10">
      <Link href="/badges" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
        <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        Alle Badges
      </Link>
      <h1 className="mb-1 font-serif text-3xl text-fg">Badges verwalten</h1>
      <p className="mb-8 text-sm text-muted">
        Hier wählst du, welches Badge neben deinem Namen steht – getrennt für Charakter und Account. Eigene Badges
        gestaltest du bei „Welt-Badges“. Die Anzeige schaltest du unter Einstellungen → Aussehen ab.
      </p>

      <nav className="mb-6 flex gap-1 rounded-xl bg-surface-2 p-1" aria-label="Bereich">
        {[
          {
            id: "charakter",
            label: character ? `Charakter: ${character.name}` : "Charakter",
            href: "/badges/verwalten",
          },
          {
            id: "account",
            label: "Account (Redaktion)",
            href: "/badges/verwalten?bereich=account",
          },
        ].map((t) => (
          <Link
            key={t.id}
            href={t.href}
            aria-current={t.id === tab ? "page" : undefined}
            className={`min-w-0 flex-1 truncate rounded-lg px-3 py-1.5 text-center text-sm font-medium transition ${
              t.id === tab ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "charakter" && character && (
        <section className="mb-10">
          <h2 className="mb-1 font-serif text-xl text-fg">Haupt-Badge von {character.name}</h2>
          <div>
            <p className="mb-1 text-sm text-fg-soft">Erscheint neben dem Namen bei Beiträgen und Kommentaren.</p>
            <FeaturedPicker
              target={{ characterId: character.id }}
              currentId={featuredChar}
              options={charBadges.filter((b) => !b.hidden).map((b) => ({
                awardId: b.awardId,
                label: `${b.icon} ${b.name}`,
              }))}
            />
          </div>
          <h2 className="mb-1 mt-8 font-serif text-xl text-fg">Welche Badges anzeigen?</h2>
          <p className="mb-2 text-sm text-fg-soft">
            Ausgeblendete Badges erscheinen nicht im Profil, nicht in deiner Sammlung für andere und nicht im Verlauf.
          </p>
          <VisibilityList
            items={charBadges.map((b) => ({
              awardId: b.awardId,
              icon: b.icon,
              name: b.name,
              hidden: !!b.hidden,
              removable: b.kind === "custom",
              from: b.kind === "custom" ? b.awardedByName : null,
            }))}
          />
        </section>
      )}

      {tab === "account" && (
        <section>
          <h2 className="mb-1 font-serif text-xl text-fg">Haupt-Abzeichen deines Accounts</h2>
          <div>
            <p className="mb-1 text-sm text-fg-soft">Erscheint neben deinem Namen in der Redaktion.</p>
            <FeaturedPicker
              target={{ account: true }}
              currentId={featuredAcc}
              options={accBadges.filter((b) => !b.hidden).map((b) => ({
                awardId: b.awardId,
                label: `${b.icon} ${b.name}`,
              }))}
            />
          </div>
          <h2 className="mb-1 mt-8 font-serif text-xl text-fg">Welche Abzeichen anzeigen?</h2>
          <VisibilityList
            items={accBadges.map((b) => ({ awardId: b.awardId, icon: b.icon, name: b.name, hidden: !!b.hidden, removable: b.kind === "custom", from: b.kind === "custom" ? b.awardedByName : null }))}
          />
        </section>
      )}
    </div>
  );
}
