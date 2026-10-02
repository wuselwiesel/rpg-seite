import Link from "next/link";
import { redirect } from "next/navigation";
import { Settings2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { getActiveCharacter, getOwnCharacters } from "@/lib/active-character";
import { ACCOUNT_CATEGORIES, AUTO_BADGES, CHARACTER_CATEGORIES } from "@/lib/badges";
import {
  accountMetrics,
  characterMetrics,
  getAccountBadges,
  getCharacterBadges,
  syncAccountBadges,
  syncCharacterBadges,
} from "@/lib/badges-server";
import { BadgeSections } from "@/components/badge-sections";
import { BadgeCard } from "@/components/badge-card";
import { AwardControls, CreateBadgeForm, DeleteDefButton, RevokeButton } from "./badge-controls";

const TABS = [
  { id: "charakter", label: "Charakter-Erfolge" },
  { id: "redaktion", label: "Redaktion" },
  { id: "welt", label: "Welt-Badges" },
] as const;
type Tab = (typeof TABS)[number]["id"];

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

// Katalog: alle Badges mit Beschreibung (so erreichst du es / was es bedeutet). Fortschritt gilt für den aktiven Charakter.
export default async function BadgesPage({ searchParams }: PageProps<"/badges">) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.bereich) ? sp.bereich[0] : sp.bereich;
  const tab: Tab = TABS.some((t) => t.id === raw) ? (raw as Tab) : "charakter";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const world = await getActiveWorld(user.id);
  const character = world ? await getActiveCharacter(user.id, world.id) : null;

  const charDefs = AUTO_BADGES.filter((b) => b.scope === "character");
  const accDefs = AUTO_BADGES.filter((b) => b.scope === "account");

  let body: React.ReactNode = null;
  let collectionHref: string | null = null;
  let collectionLabel = "";
  let summary = "";

  if (tab === "charakter") {
    if (character) await syncCharacterBadges(character.id);
    const [badges, metrics] = await Promise.all([
      character ? getCharacterBadges(character.id) : Promise.resolve([]),
      character ? characterMetrics(supabase, character.id) : Promise.resolve(undefined),
    ]);
    const earned = badges.filter((b) => b.kind === "auto");
    body = <BadgeSections defs={charDefs} categories={CHARACTER_CATEGORIES} earned={earned} metrics={metrics} />;
    if (character) {
      collectionHref = `/badges/sammlung/${character.id}`;
      collectionLabel = `Sammlung von ${character.name}`;
      summary = `${character.name} hat ${earned.length} von ${charDefs.length} Erfolgen.`;
    } else {
      summary = `${charDefs.length} Erfolge für Charaktere.`;
    }
  } else if (tab === "redaktion") {
    await syncAccountBadges();
    const [badges, metrics] = await Promise.all([getAccountBadges(user.id), accountMetrics(supabase, user.id)]);
    const earned = badges.filter((b) => b.kind === "account");
    body = <BadgeSections defs={accDefs} categories={ACCOUNT_CATEGORIES} earned={earned} metrics={metrics} />;
    collectionHref = `/badges/konto/${user.id}`;
    collectionLabel = "Meine Sammlung";
    summary = `Du hast ${earned.length} von ${accDefs.length} Abzeichen. Sie gehören zu deinem Account.`;
  } else {
    let defs: DefRow[] = [];
    let awards: AwardLine[] = [];
    let worldCharacters: { id: string; name: string }[] = [];
    const ownCharacters = world ? (await getOwnCharacters(user.id, world.id)).map((c) => ({ id: c.id, name: c.name })) : [];
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
        const { data: a } = await supabase
          .from("badge_awards")
          .select("id, def_id, characters(id, name)")
          .in("def_id", defs.map((d) => d.id))
          .returns<AwardLine[]>();
        awards = a ?? [];
      }
    }
    const isWorldOwner = world?.created_by === user.id;
    summary = world
      ? `Eigene Titel und Badges für ${world.name}. Alle Mitglieder können Badges gestalten und selbst verleihen, die Spielleitung (Welt-Besitzer:in) kann jedes Badge verleihen.`
      : "Wähle zuerst eine Welt.";
    body = (
      <div className="flex flex-col gap-8">
        {defs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
            In dieser Welt gibt es noch keine eigenen Badges. Gestalte unten das erste.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {defs.map((d) => {
              const given = awards.filter((a) => a.def_id === d.id && a.characters);
              const mine = d.created_by === user.id;
              const canAward = mine || isWorldOwner;
              const by = d.creator?.nickname || d.creator?.username;
              return (
                <BadgeCard
                  key={d.id}
                  icon={d.icon}
                  name={d.name}
                  description={d.description || "Ein besonderer Titel aus dieser Welt."}
                  color={d.color}
                  hideStatus
                  footnote={[by ? `Von ${by}` : null, given.length ? null : "Noch an niemanden verliehen"]
                    .filter(Boolean)
                    .join(" · ")}
                >
                  {given.length > 0 && (
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-soft">
                      Verliehen an
                      {given.map((a) => (
                        <span key={a.id} className="inline-flex items-center gap-1">
                          {a.characters!.name}
                          {canAward && <RevokeButton awardId={a.id} label={`${d.name} bei ${a.characters!.name}`} />}
                        </span>
                      ))}
                    </p>
                  )}
                  {canAward && <AwardControls defId={d.id} characters={worldCharacters} ownCharacters={ownCharacters} defaultAsId={character?.id ?? null} />}
                  {canAward && (
                    <div className="mt-2">
                      <DeleteDefButton defId={d.id} name={d.name} />
                    </div>
                  )}
                </BadgeCard>
              );
            })}
          </ul>
        )}
        {world && (
          <section>
            <h2 className="mb-2 font-serif text-xl text-fg">Neues Welt-Badge</h2>
            <CreateBadgeForm />
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
      <div className="mb-1 flex items-start justify-between gap-3">
        <h1 className="font-serif text-3xl text-fg">Alle Badges</h1>
        <Link
          href="/badges/verwalten"
          className="mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-surface-2 px-3 py-1.5 text-sm font-medium text-fg transition hover:bg-surface-3"
        >
          <Settings2 className="h-4 w-4" strokeWidth={2} />
          Verwalten
        </Link>
      </div>
      <p className="mb-5 text-sm text-muted">
        Hier steht, was es gibt und wie du es bekommst. Die Badges, die jemand schon hat, siehst du in dessen Sammlung.
      </p>

      <nav className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-surface-2 p-1" aria-label="Bereich">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={t.id === "charakter" ? "/badges" : `/badges?bereich=${t.id}`}
            aria-current={t.id === tab ? "page" : undefined}
            className={`shrink-0 flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-center text-sm font-medium transition ${
              t.id === tab ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-2 text-sm text-fg-soft">
        <p>{summary}</p>
        {collectionHref && (
          <Link href={collectionHref} className="font-medium text-accent hover:underline">
            {collectionLabel}
          </Link>
        )}
      </div>

      {body}
    </div>
  );
}
