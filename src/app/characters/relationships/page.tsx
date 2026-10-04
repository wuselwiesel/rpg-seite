import Link from "next/link";
import { redirect } from "next/navigation";
import { Network } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { getActiveCharacter } from "@/lib/active-character";
import { CharacterAvatar } from "@/components/character-avatar";
import { REL_CATEGORIES } from "@/lib/relationships";
import type { Character, CharacterRelationship, RelationshipHistoryEntry } from "@/lib/types";
import { RelationshipGraph } from "./relationship-graph";
import { RelationshipForm } from "./relationship-form";
import { RelationshipList } from "./relationship-list";
import { RelationshipTimeline } from "./relationship-timeline";
import { FamilyTree } from "./family-tree";

const VIEWS = [
  { id: "netz", label: "Netz" },
  { id: "verlauf", label: "Verlauf" },
  { id: "stammbaum", label: "Stammbaum" },
] as const;

export default async function RelationshipsPage({ searchParams }: PageProps<"/characters/relationships">) {
  const params = await searchParams;
  const view = VIEWS.find((v) => v.id === params.ansicht)?.id ?? "netz";
  const art = REL_CATEGORIES.find((c) => c.id === params.art)?.id ?? "";
  const haus = typeof params.haus === "string" ? params.haus : "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const activeWorld = await getActiveWorld(user.id);
  if (!activeWorld) redirect("/worlds");

  const activeCharacter = await getActiveCharacter(user.id, activeWorld.id);

  const [{ data: characters }, { data: relationships }, { data: worldRow }, { data: history }] = await Promise.all([
    supabase.from("characters").select("*").eq("world_id", activeWorld.id).order("name").returns<Character[]>(),
    supabase.from("character_relationships").select("*").eq("world_id", activeWorld.id).returns<CharacterRelationship[]>(),
    supabase.from("worlds").select("created_by").eq("id", activeWorld.id).maybeSingle(),
    supabase
      .from("relationship_history")
      .select("*")
      .eq("world_id", activeWorld.id)
      .order("created_at", { ascending: true })
      .returns<RelationshipHistoryEntry[]>(),
  ]);

  const isWorldOwner = worldRow?.created_by === user.id;
  const allChars = characters ?? [];
  const allRels = relationships ?? [];
  const counts = new Map<string, number>();
  for (const r of allRels) counts.set(r.category, (counts.get(r.category) ?? 0) + 1);

  const shownRels = art ? allRels.filter((r) => r.category === art) : allRels;
  const involved = new Set(shownRels.flatMap((r) => [r.character_a_id, r.character_b_id]));
  const shownChars = art ? allChars.filter((c) => involved.has(c.id)) : allChars;

  const houses = Array.from(new Set(allChars.map((c) => c.house).filter((h): h is string => !!h))).sort();
  const treeChars = haus ? allChars.filter((c) => c.house === haus) : allChars;
  const treeIds = new Set(treeChars.map((c) => c.id));
  const treeRels = haus ? allRels.filter((r) => treeIds.has(r.character_a_id) && treeIds.has(r.character_b_id)) : allRels;

  const href = (next: { ansicht?: string; art?: string; haus?: string }) => {
    const q = new URLSearchParams();
    const v = next.ansicht ?? view;
    if (v !== "netz") q.set("ansicht", v);
    const a = "art" in next ? next.art : art;
    if (a) q.set("art", a);
    const h = "haus" in next ? next.haus : haus;
    if (h) q.set("haus", h);
    const s = q.toString();
    return `/characters/relationships${s ? `?${s}` : ""}`;
  };

  const chip = (active: boolean) =>
    `rounded-full px-3 py-1 text-xs font-medium transition ${
      active ? "bg-accent-strong text-on-accent-strong" : "bg-surface-2 text-fg-soft hover:text-fg"
    }`;

  return (
    <div className="mx-auto max-w-2xl xl:max-w-3xl 2xl:max-w-4xl px-4 py-10">
      <div className="mb-4 flex items-center gap-2">
        <Network className="h-6 w-6 text-accent" strokeWidth={2} />
        <h1 className="font-serif text-3xl text-fg">Beziehungsnetz</h1>
      </div>

      <div className="mb-4 flex gap-1 rounded-lg bg-surface-2 p-1" role="tablist">
        {VIEWS.map((v) => (
          <Link
            key={v.id}
            href={href({ ansicht: v.id })}
            role="tab"
            aria-selected={view === v.id}
            className={`flex-1 rounded-md px-3 py-1.5 text-center text-sm font-medium transition ${
              view === v.id ? "bg-surface text-fg" : "text-muted hover:text-fg-soft"
            }`}
          >
            {v.label}
          </Link>
        ))}
      </div>

      {view !== "stammbaum" ? (
        <div className="mb-5 flex flex-wrap gap-2">
          <Link href={href({ art: "" })} className={chip(!art)}>
            Alle ({allRels.length})
          </Link>
          {REL_CATEGORIES.filter((c) => counts.get(c.id)).map((c) => (
            <Link key={c.id} href={href({ art: c.id })} className={chip(art === c.id)}>
              <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ backgroundColor: c.color }} />
              {c.label} ({counts.get(c.id)})
            </Link>
          ))}
        </div>
      ) : (
        houses.length > 0 && (
          <div className="mb-5 flex flex-wrap gap-2">
            <Link href={href({ haus: "" })} className={chip(!haus)}>
              Alle Häuser
            </Link>
            {houses.map((h) => (
              <Link key={h} href={href({ haus: h })} className={chip(haus === h)}>
                {h}
              </Link>
            ))}
          </div>
        )
      )}

      {view === "netz" && (
        <div className="mb-8 rounded-2xl bg-surface-2 p-6">
          <RelationshipGraph characters={shownChars} relationships={shownRels} initialFocusId={activeCharacter?.id} history={history ?? []} />
        </div>
      )}

      {view === "verlauf" && (
        <div className="mb-8">
          <RelationshipTimeline
            relationships={shownRels}
            history={history ?? []}
            characters={allChars}
            currentUserId={user.id}
            isWorldOwner={isWorldOwner}
          />
        </div>
      )}

      {view === "stammbaum" && (
        <div className="mb-8">
          <FamilyTree characters={treeChars} relationships={treeRels} />
          {houses.length > 0 && (
            <div className="mt-6">
              <h2 className="mb-3 font-serif text-lg text-fg">Häuser und Familien</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {houses
                  .filter((h) => !haus || h === haus)
                  .map((h) => (
                    <div key={h} className="rounded-xl bg-surface-2 p-4">
                      <p className="mb-2 font-serif text-base text-fg">{h}</p>
                      <div className="flex flex-wrap gap-2">
                        {allChars
                          .filter((c) => c.house === h)
                          .map((c) => (
                            <Link
                              key={c.id}
                              href={`/characters/${c.id}`}
                              className="flex items-center gap-1.5 rounded-full bg-surface px-2 py-1 text-xs text-fg-soft transition hover:text-accent"
                            >
                              <CharacterAvatar name={c.name} avatarUrl={c.avatar_url} size={20} />
                              {c.name}
                            </Link>
                          ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
          {houses.length === 0 && (
            <p className="mt-4 text-xs text-muted">
              Tipp: Trag bei deinem Charakter unter „Bearbeiten“ ein Haus oder eine Familie ein, dann erscheinen die Häuser
              farbig im Stammbaum.
            </p>
          )}
        </div>
      )}

      <h2 className="mb-3 font-serif text-lg text-fg">Neue Beziehung</h2>
      <div className="mb-8">
        <RelationshipForm characters={allChars} />
      </div>

      <h2 className="mb-3 font-serif text-lg text-fg">Alle Beziehungen</h2>
      <RelationshipList
        relationships={view === "stammbaum" ? allRels.filter((r) => r.category === "familie") : shownRels}
        characters={allChars}
        currentUserId={user.id}
        isWorldOwner={isWorldOwner}
      />
    </div>
  );
}
