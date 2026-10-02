import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { getActiveCharacter } from "@/lib/active-character";
import { AUTO_BADGES } from "@/lib/badges";
import {
  accountMetrics,
  characterMetrics,
  getAccountBadges,
  getCharacterBadges,
  syncAccountBadges,
  syncCharacterBadges,
} from "@/lib/badges-server";
import { BadgeChip } from "@/components/badge-chip";
import { AwardControls, CreateBadgeForm, DeleteDefButton, FeaturedPicker, RevokeButton } from "./badge-controls";

type DefRow = {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  created_by: string;
  creator: { username: string; nickname: string | null } | null;
};
type AwardLine = { id: string; def_id: string; characters: { id: string; name: string } | null };

export default async function BadgesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const world = await getActiveWorld(user.id);
  const character = world ? await getActiveCharacter(user.id, world.id) : null;

  // Neu erreichte Erfolge direkt vergeben, bevor die Seite die Liste liest.
  if (character) await syncCharacterBadges(character.id);
  await syncAccountBadges();

  const [charBadges, accBadges, charMetrics, accMetrics, featuredRows] = await Promise.all([
    character ? getCharacterBadges(character.id) : Promise.resolve([]),
    getAccountBadges(user.id),
    character ? characterMetrics(supabase, character.id) : Promise.resolve({} as Record<string, number>),
    accountMetrics(supabase, user.id),
    Promise.all([
      character
        ? supabase.from("characters").select("featured_badge_id").eq("id", character.id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("profiles").select("featured_badge_id").eq("id", user.id).maybeSingle(),
    ]),
  ]);
  const featuredChar = (featuredRows[0].data as { featured_badge_id: string | null } | null)?.featured_badge_id ?? null;
  const featuredAcc = (featuredRows[1].data as { featured_badge_id: string | null } | null)?.featured_badge_id ?? null;

  let defs: DefRow[] = [];
  let awards: AwardLine[] = [];
  let worldCharacters: { id: string; name: string }[] = [];
  if (world) {
    const [defRes, charRes] = await Promise.all([
      supabase
        .from("badge_defs")
        .select("id, name, description, icon, color, created_by, creator:created_by(username, nickname)")
        .eq("world_id", world.id)
        .order("created_at", { ascending: true })
        .returns<DefRow[]>(),
      supabase.from("characters").select("id, name").eq("world_id", world.id).order("name"),
    ]);
    defs = defRes.data ?? [];
    worldCharacters = charRes.data ?? [];
    if (defs.length) {
      const { data } = await supabase
        .from("badge_awards")
        .select("id, def_id, characters(id, name)")
        .in("def_id", defs.map((d) => d.id))
        .returns<AwardLine[]>();
      awards = data ?? [];
    }
  }
  const isWorldOwner = world?.created_by === user.id;

  const autoList = (scope: "character" | "account", have: Set<string>, metrics: Record<string, number>) => (
    <div className="flex flex-wrap gap-2">
      {AUTO_BADGES.filter((b) => b.scope === scope).map((b) => {
        const got = have.has(b.key);
        const value = Math.min(metrics[b.metric] ?? 0, b.threshold);
        return (
          <BadgeChip
            key={b.key}
            icon={b.icon}
            name={b.name}
            description={b.description}
            color={b.color}
            locked={!got}
            progress={got ? undefined : `${value}/${b.threshold}`}
          />
        );
      })}
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-10">
      <h1 className="mb-1 font-serif text-3xl text-fg">Badges</h1>
      <p className="mb-8 text-sm text-muted">Erfolge, Titel und eigene Badges. Ausschalten kannst du die Anzeige unter Einstellungen → Aussehen.</p>

      {character && (
        <section className="mb-10">
          <h2 className="mb-1 font-serif text-xl text-fg">Erfolge von {character.name}</h2>
          <p className="mb-3 text-xs text-muted">Werden automatisch vergeben, sobald du sie erreichst.</p>
          {autoList("character", new Set(charBadges.filter((b) => b.kind === "auto").map((b) => b.key)), charMetrics)}
          <div className="mt-4">
            <p className="mb-1 text-sm text-fg-soft">Haupt-Badge (erscheint neben dem Namen)</p>
            <FeaturedPicker
              target={{ characterId: character.id }}
              currentId={featuredChar}
              options={charBadges.map((b) => ({ awardId: b.awardId, label: `${b.icon} ${b.name}` }))}
            />
          </div>
        </section>
      )}

      {world && (
        <section className="mb-10">
          <h2 className="mb-1 font-serif text-xl text-fg">Titel &amp; Badges in {world.name}</h2>
          <p className="mb-3 text-xs text-muted">
            Alle Mitglieder können Badges gestalten und selbst verleihen. Die Spielleitung (Welt-Besitzer:in) kann jedes Badge verleihen.
          </p>
          {defs.length === 0 ? (
            <p className="mb-4 text-sm text-muted">Noch keine Badges in dieser Welt.</p>
          ) : (
            <ul className="mb-4 flex flex-col gap-3">
              {defs.map((d) => {
                const mine = d.created_by === user.id;
                const canAward = mine || isWorldOwner;
                const given = awards.filter((a) => a.def_id === d.id);
                return (
                  <li key={d.id} className="rounded-xl bg-surface-2 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <BadgeChip icon={d.icon} name={d.name} description={d.description ?? undefined} color={d.color} />
                        {d.description && <p className="mt-1 text-xs text-fg-soft">{d.description}</p>}
                        <p className="mt-0.5 text-[11px] text-muted">von {d.creator?.nickname || d.creator?.username || "?"}</p>
                      </div>
                      {(mine || isWorldOwner) && <DeleteDefButton defId={d.id} name={d.name} />}
                    </div>
                    {given.length > 0 && (
                      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-soft">
                        {given.map((a) => (
                          <span key={a.id} className="inline-flex items-center gap-1">
                            {a.characters?.name ?? "?"}
                            {canAward && <RevokeButton awardId={a.id} label={`${d.name} bei ${a.characters?.name ?? "?"}`} />}
                          </span>
                        ))}
                      </p>
                    )}
                    {canAward && <AwardControls defId={d.id} characters={worldCharacters} />}
                  </li>
                );
              })}
            </ul>
          )}
          <CreateBadgeForm />
        </section>
      )}

      <section>
        <h2 className="mb-1 font-serif text-xl text-fg">Redaktions-Abzeichen</h2>
        <p className="mb-3 text-xs text-muted">Gehören zu deinem Account, nicht zu einem Charakter.</p>
        {autoList("account", new Set(accBadges.map((b) => b.key)), accMetrics)}
        <div className="mt-4">
          <p className="mb-1 text-sm text-fg-soft">Haupt-Abzeichen (erscheint neben deinem Namen in der Redaktion)</p>
          <FeaturedPicker
            target={{ account: true }}
            currentId={featuredAcc}
            options={accBadges.map((b) => ({ awardId: b.awardId, label: `${b.icon} ${b.name}` }))}
          />
        </div>
      </section>
    </div>
  );
}
