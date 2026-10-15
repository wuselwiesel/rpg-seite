"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { CharacterAvatar } from "@/components/character-avatar";

export type OMember = { userId: string; name: string; role: "owner" | "admin" | "member"; lastWritten: string; avatarUrl: string | null };
export type OChar = { id: string; name: string; avatarUrl: string | null; ownerId: string; isNpc: boolean; claimable: boolean; species: string | null };

const ROLE_LABEL = { owner: "Besitzer:in", admin: "Admin", member: "Mitglied" } as const;
const NO_SPECIES = "Ohne Wesen";

function norm(s: string) {
  return s.toLocaleLowerCase("de");
}

// Kurzfassung der Wesen einer Person in Reihenfolge ihrer Häufigkeit, z. B. „Werwolf ×2, Mensch“
function speciesSummary(list: OChar[]): string | null {
  const count = new Map<string, number>();
  for (const c of list) if (c.species) count.set(c.species, (count.get(c.species) ?? 0) + 1);
  if (count.size === 0) return null;
  return [...count.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "de"))
    .map(([s, n]) => (n > 1 ? `${s} ×${n}` : s))
    .join(", ");
}

function CharLine({ c, owner }: { c: OChar; owner?: string }) {
  return (
    <li>
      <Link href={`/characters/${c.id}`} className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-surface-2">
        <CharacterAvatar name={c.name} avatarUrl={c.avatarUrl} size={32} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-fg">{c.name}</span>
          {owner && <span className="block truncate text-xs text-muted">{owner}</span>}
        </span>
        {c.claimable && <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">Zu vergeben</span>}
        {c.isNpc && !c.claimable && <span className="shrink-0 rounded-full bg-surface-3 px-2 py-0.5 text-xs text-fg-soft">NPC</span>}
        {c.species && <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-xs text-fg-soft">{c.species}</span>}
      </Link>
    </li>
  );
}

// Alle Mitglieder mit ihren Charakteren und Wesen, umschaltbar nach Mitgliedern oder nach Wesen; mit Suche
export function MembersCharacters({ members, characters }: { members: OMember[]; characters: OChar[] }) {
  const [view, setView] = useState<"members" | "species">("members");
  const [query, setQuery] = useState("");
  const q = norm(query.trim());

  const memberName = useMemo(() => new Map(members.map((m) => [m.userId, m.name])), [members]);
  const players = characters.filter((c) => !c.isNpc);
  const npcs = characters.filter((c) => c.isNpc);

  const matches = (c: OChar, ownerName?: string) => !q || norm(c.name).includes(q) || norm(c.species ?? "").includes(q) || norm(ownerName ?? "").includes(q);

  // Nach Mitgliedern
  const byMember = members
    .map((m) => ({ m, list: players.filter((c) => c.ownerId === m.userId) }))
    .filter(({ m, list }) => !q || norm(m.name).includes(q) || list.some((c) => matches(c, m.name)))
    .map(({ m, list }) => ({ m, list: q && !norm(m.name).includes(q) ? list.filter((c) => matches(c, m.name)) : list }));
  const npcList = npcs.filter((c) => matches(c, memberName.get(c.ownerId)));

  // Nach Wesen: Spielfiguren und NPCs gemeinsam, größte Gruppe zuerst
  const bySpecies = useMemo(() => {
    const map = new Map<string, OChar[]>();
    for (const c of characters) {
      if (!matches(c, memberName.get(c.ownerId))) continue;
      const key = c.species ?? NO_SPECIES;
      map.set(key, [...(map.get(key) ?? []), c]);
    }
    return [...map.entries()].sort((a, b) => {
      if (a[0] === NO_SPECIES) return 1;
      if (b[0] === NO_SPECIES) return -1;
      return b[1].length - a[1].length || a[0].localeCompare(b[0], "de");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characters, q, memberName]);

  // Standard: kompakte Liste; ein Klick auf ein Mitglied klappt seine Charaktere auf
  const [openAll, setOpenAll] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Ansicht" className="flex gap-1 rounded-xl bg-surface-2 p-1 text-sm font-medium">
          {(
            [
              { id: "members", label: "Nach Mitgliedern" },
              { id: "species", label: "Nach Wesen" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={view === t.id}
              onClick={() => setView(t.id)}
              className={`rounded-lg px-3 py-1.5 transition ${view === t.id ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <label className="relative min-w-[11rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={2} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Mitglied, Charakter oder Wesen suchen"
            aria-label="Mitglied, Charakter oder Wesen suchen"
            className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-sm text-fg outline-none focus:border-accent"
          />
        </label>
      </div>

      {view === "members" && byMember.length > 1 && (
        <button type="button" onClick={() => setOpenAll((v) => !v)} className="w-fit text-sm text-accent hover:underline">
          {openAll ? "Alle zuklappen" : "Alle aufklappen"}
        </button>
      )}

      {view === "members" ? (
        <div className="flex flex-col gap-2">
          {byMember.map(({ m, list }) => (
            <details key={`${m.userId}-${openAll}`} open={openAll || Boolean(q)} className="group rounded-2xl border border-line bg-surface">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 [&::-webkit-details-marker]:hidden">
                <CharacterAvatar name={m.name} avatarUrl={m.avatarUrl} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-fg">
                    {m.name} <span className="ml-1 text-xs font-normal text-muted">{ROLE_LABEL[m.role]}</span>
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {speciesSummary(list) ?? "Noch kein Charakter"} · zuletzt geschrieben: {m.lastWritten}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-fg-soft">
                  {list.length} {list.length === 1 ? "Charakter" : "Charaktere"}
                </span>
              </summary>
              <div className="border-t border-line px-2 py-2">
                {list.length === 0 ? (
                  <p className="px-2 py-1.5 text-sm text-muted">Noch kein Charakter in dieser Welt.</p>
                ) : (
                  <ul className="flex flex-col">
                    {list.map((c) => (
                      <CharLine key={c.id} c={c} />
                    ))}
                  </ul>
                )}
              </div>
            </details>
          ))}
          {npcList.length > 0 && (
            <details key={`npcs-${openAll}`} open={openAll || Boolean(q)} className="group rounded-2xl border border-dashed border-line bg-surface">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                <span className="min-w-0 flex-1 font-medium text-fg">NPCs und freie Rollen</span>
                <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-fg-soft">{npcList.length}</span>
              </summary>
              <div className="border-t border-line px-2 py-2">
                <ul className="flex flex-col">
                  {npcList.map((c) => (
                    <CharLine key={c.id} c={c} owner={`angelegt von ${memberName.get(c.ownerId) ?? "?"}`} />
                  ))}
                </ul>
              </div>
            </details>
          )}
          {byMember.length === 0 && npcList.length === 0 && <p className="text-sm text-muted">Nichts gefunden.</p>}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {bySpecies.map(([species, list]) => (
            <details key={species} open className="group rounded-2xl border border-line bg-surface">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                <span className="min-w-0 flex-1 font-medium text-fg">{species}</span>
                <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-fg-soft">{list.length}</span>
              </summary>
              <div className="border-t border-line px-2 py-2">
                <ul className="flex flex-col">
                  {list.map((c) => (
                    <CharLine key={c.id} c={{ ...c, species: null }} owner={c.isNpc ? `NPC, angelegt von ${memberName.get(c.ownerId) ?? "?"}` : (memberName.get(c.ownerId) ?? "?")} />
                  ))}
                </ul>
              </div>
            </details>
          ))}
          {bySpecies.length === 0 && <p className="text-sm text-muted">Nichts gefunden.</p>}
        </div>
      )}
    </div>
  );
}
