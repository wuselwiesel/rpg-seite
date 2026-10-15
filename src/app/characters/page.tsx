import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOwnCharacters, getWorldNpcs } from "@/lib/active-character";
import { getWorldAdminIds } from "@/lib/npc-data";
import { canEditCharacter } from "@/lib/npc";
import { NpcBadge } from "@/components/npc-badge";
import { getActiveWorld } from "@/lib/worlds";
import { Check } from "lucide-react";
import { SetActiveButton } from "./set-active-button";
import { DeleteCharacterIcon } from "./delete-character-icon";
import { RevealRow } from "@/components/reveal-row";
import { CharacterAvatar } from "@/components/character-avatar";
import { ACTIVE_CHARACTER_COOKIE } from "@/lib/types";
import { cookies } from "next/headers";
import { NpcRoleActions } from "./npc-role-actions";
import { CreatedList, type CreatedCharacter } from "./created-list";
import { getWorldChoiceLists } from "@/lib/choice-lists-data";
import { speciesLabelOf, speciesListOf } from "@/lib/world-species";

export default async function CharactersPage({ searchParams }: PageProps<"/characters">) {
  const sp = await searchParams;
  const tabParam = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;
  const showNpcs = tabParam === "npcs";
  const showCreated = tabParam === "angelegt";
  const showCharacters = !showNpcs && !showCreated;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const activeWorld = await getActiveWorld(user.id);
  if (!activeWorld) redirect("/worlds");

  const [characters, npcs, worldAdminIds] = await Promise.all([getOwnCharacters(user.id, activeWorld.id), getWorldNpcs(activeWorld.id), getWorldAdminIds(activeWorld.id)]);
  // Gelöschte, aber noch wiederherstellbare Charaktere (nur eigene)
  const { count: deletedCount = 0 } = await supabase
    .from("characters")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id)
    .not("deleted_at", "is", null);
  // Offene Anfragen und Angebote zu NPCs (eigene bzw. für Admins alle) und die Mitglieder zum Anbieten
  const isWorldAdmin = worldAdminIds.includes(user.id);
  const [{ data: claimRows }, { data: memberRows }] = await Promise.all([
    supabase.from("character_claims").select("id, character_id, user_id, kind").eq("world_id", activeWorld.id).eq("status", "pending").returns<{ id: string; character_id: string; user_id: string; kind: "request" | "offer" }[]>(),
    supabase.from("world_members").select("user_id, profiles(username, nickname)").eq("world_id", activeWorld.id).returns<{ user_id: string; profiles: { username: string; nickname: string | null } | null }[]>(),
  ]);
  const memberOptions = (memberRows ?? []).map((m) => ({ id: m.user_id, name: m.profiles?.nickname || m.profiles?.username || "?" }));
  const nameOf = new Map(memberOptions.map((m) => [m.id, m.name]));

  // Von mir angelegte Charaktere (auch die, die inzwischen anderen gehören) mit Stand der Vergabe
  const speciesList = speciesListOf(await getWorldChoiceLists(activeWorld.id));
  const { data: createdRows } = await supabase
    .from("characters")
    .select("id, name, avatar_url, owner_id, is_npc, claimable, choices, species, owner:profiles!characters_owner_id_fkey(username, nickname)")
    .eq("world_id", activeWorld.id)
    .eq("created_by", user.id)
    .is("deleted_at", null)
    .order("name")
    .returns<{ id: string; name: string; avatar_url: string | null; owner_id: string; is_npc: boolean | null; claimable: boolean | null; choices: Record<string, unknown> | null; species: string | null; owner: { username: string; nickname: string | null } | null }[]>();
  const created: CreatedCharacter[] = (createdRows ?? []).map((c) => {
    const isNpcRow = Boolean(c.is_npc);
    const status = c.claimable ? "free" : isNpcRow ? "npc" : c.owner_id === user.id ? "mine" : "assigned";
    const offerRow = (claimRows ?? []).find((q) => q.character_id === c.id && q.kind === "offer");
    return {
      id: c.id,
      name: c.name,
      avatarUrl: c.avatar_url,
      species: speciesLabelOf(c, speciesList),
      status,
      ownerName: c.owner ? c.owner.nickname || c.owner.username : null,
      isMain: !isNpcRow,
      canManage: isNpcRow ? isWorldAdmin || c.owner_id === user.id : c.owner_id === user.id,
      offer: offerRow ? { claimId: offerRow.id, toName: nameOf.get(offerRow.user_id) ?? "?" } : null,
      requestCount: isWorldAdmin || c.owner_id === user.id ? (claimRows ?? []).filter((q) => q.character_id === c.id && q.kind === "request").length : 0,
    };
  });
  const cookieStore = await cookies();
  const activeId = cookieStore.get(ACTIVE_CHARACTER_COOKIE)?.value ?? characters[0]?.id;

  return (
    <div className="mx-auto max-w-2xl xl:max-w-3xl 2xl:max-w-4xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="font-serif text-3xl text-fg">{showNpcs ? "NPCs" : showCreated ? "Von mir angelegt" : "Deine Charaktere"}</h1>
          <p className="truncate text-sm text-muted">in {activeWorld.name}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {(deletedCount ?? 0) > 0 && (
            <Link
              href="/characters/geloescht"
              className="rounded-md border border-line px-4 py-2 text-sm font-medium text-fg-soft transition hover:bg-surface-2 hover:text-fg"
            >
              Gelöscht ({deletedCount})
            </Link>
          )}
          <Link
            href="/characters/relationships"
            className="rounded-md border border-line px-4 py-2 text-sm font-medium text-fg-soft transition hover:bg-surface-2 hover:text-fg"
          >
            Beziehungsnetz
          </Link>
          <Link
            href={showNpcs ? "/characters/new?npc=1" : "/characters/new"}
            className="rounded-md bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90"
          >
            {showNpcs ? "+ Neuer NPC" : "+ Neuer Charakter"}
          </Link>
        </div>
      </div>

      <div role="tablist" aria-label="Charaktere und NPCs" className="mb-5 flex gap-1 rounded-xl bg-surface-2 p-1 text-sm font-medium">
        {[
          { id: "charaktere", href: "/characters", label: "Charaktere", count: characters.length, on: showCharacters },
          { id: "npcs", href: "/characters?tab=npcs", label: "NPCs", count: npcs.length, on: showNpcs },
          { id: "angelegt", href: "/characters?tab=angelegt", label: "Angelegt", count: created.length, on: showCreated },
        ].map((t) => (
          <Link
            key={t.id}
            href={t.href}
            role="tab"
            aria-selected={t.on}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 transition ${t.on ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"}`}
          >
            {t.label}
            <span className="text-xs text-muted">{t.count}</span>
          </Link>
        ))}
      </div>

      {showCreated && (
        <CreatedList
          items={created}
          members={memberOptions.filter((m) => m.id !== user.id)}
          worldId={activeWorld.id}
        />
      )}

      {showNpcs && (
        <>
          {npcs.length === 0 && (
            <p className="text-muted">
              Noch kein NPC in dieser Welt.{" "}
              <Link href="/characters/new?npc=1" className="text-accent hover:underline">
                Leg jetzt einen an.
              </Link>
            </p>
          )}
          <ul className="flex flex-col gap-3">
            {npcs.map((npc) => (
              <RevealRow
                key={npc.id}
                className="flex-wrap gap-3 rounded-2xl border border-line bg-surface p-4"
                actions={canEditCharacter(npc, user.id, worldAdminIds) ? <DeleteCharacterIcon characterId={npc.id} characterName={npc.name} /> : null}
              >
                <Link href={`/characters/${npc.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                  <CharacterAvatar name={npc.name} avatarUrl={npc.avatar_url} size={52} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate font-medium text-fg">
                      <span className="truncate">{npc.name}</span>
                      <NpcBadge />
                      {npc.claimable && <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">Zu vergeben</span>}
                    </p>
                    {npc.bio && <p className="line-clamp-1 text-sm text-muted">{npc.bio}</p>}
                  </div>
                </Link>
                <Link href={`/characters/${npc.id}/chabo`} className="shrink-0 rounded-lg bg-surface-2 px-3 py-1.5 text-sm text-fg-soft transition hover:text-fg">
                  ChaBo
                </Link>
                {(isWorldAdmin || npc.claimable) && (
                  <NpcRoleActions
                    characterId={npc.id}
                    claimable={Boolean(npc.claimable)}
                    isAdmin={isWorldAdmin}
                    myRequestId={(claimRows ?? []).find((c) => c.character_id === npc.id && c.kind === "request" && c.user_id === user.id)?.id ?? null}
                    offer={(() => {
                      const o = (claimRows ?? []).find((c) => c.character_id === npc.id && c.kind === "offer");
                      return o ? { claimId: o.id, toName: nameOf.get(o.user_id) ?? "?" } : null;
                    })()}
                    members={memberOptions}
                  />
                )}
                {canEditCharacter(npc, user.id, worldAdminIds) && (
                  <Link href={`/characters/${npc.id}/edit`} className="shrink-0 rounded-lg bg-surface-2 px-3 py-1.5 text-sm text-fg-soft transition hover:text-fg">
                    Bearbeiten
                  </Link>
                )}
              </RevealRow>
            ))}
          </ul>
        </>
      )}

      {showCharacters && characters.length === 0 && (
        <p className="text-muted">
          Du hast noch keinen Charakter in dieser Welt.{" "}
          <Link href="/characters/new" className="text-accent hover:underline">
            Leg jetzt einen an.
          </Link>
        </p>
      )}

      <ul className={`flex flex-col gap-3 ${showCharacters ? "" : "hidden"}`}>
        {characters.map((character) => (
          <RevealRow
            key={character.id}
            className={`flex-wrap gap-3 rounded-2xl border bg-surface p-4 transition ${
              character.id === activeId ? "border-accent/60" : "border-line"
            }`}
            actions={<DeleteCharacterIcon characterId={character.id} characterName={character.name} />}
          >
            <Link href={`/characters/${character.id}`} className="flex min-w-0 flex-1 items-center gap-4">
              <span className="relative shrink-0">
                <CharacterAvatar name={character.name} avatarUrl={character.avatar_url} size={52} />
                {character.id === activeId && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-surface bg-accent text-on-accent-strong"
                    aria-hidden
                  >
                    <Check className="h-3 w-3 text-white" strokeWidth={3.5} />
                  </span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate font-medium text-fg hover:text-accent">
                  <span className="truncate">{character.name}</span>
                  {character.claimable && <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">Zu vergeben</span>}
                </p>
                {character.bio && (
                  <p className="line-clamp-1 text-sm text-muted">{character.bio}</p>
                )}
              </div>
            </Link>
            {character.id === activeId ? (
              <span className="shrink-0 text-xs font-medium text-accent">Aktiv</span>
            ) : (
              <SetActiveButton characterId={character.id} />
            )}
          </RevealRow>
        ))}
      </ul>
    </div>
  );
}
