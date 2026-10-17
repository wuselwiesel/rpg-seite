"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { CharacterAvatar } from "@/components/character-avatar";
import { AvailabilityBadge } from "@/components/character-availability";
import { NpcRoleActions } from "@/app/characters/npc-role-actions";

export type RosterStatus = "free" | "npc" | "taken" | "mine" | "review";

export type RosterCharacter = {
  id: string;
  name: string;
  avatarUrl: string | null;
  species: string | null;
  status: RosterStatus;
  isNpc: boolean;
  availability: "free" | "busy" | null;
  location: string | null;
  reviewStatus: "pending" | "approved" | "rejected";
  claimable: boolean;
  ownerName: string | null;
  createdAt: string;
  // Darf der angemeldete Mensch diesen Charakter freigeben und anbieten?
  canManage: boolean;
  myRequestId: string | null;
  offer: { claimId: string; toName: string } | null;
  requestCount: number;
};

export type RosterMember = { id: string; name: string; hasCharacter: boolean };

const PAGE = 40;

const FILTERS: { key: "all" | RosterStatus; label: string }[] = [
  { key: "all", label: "Alle" },
  { key: "free", label: "Frei" },
  { key: "taken", label: "Vergeben" },
  { key: "review", label: "Zur Prüfung" },
  { key: "mine", label: "Meine" },
  { key: "npc", label: "NPCs" },
];

// „Vergeben“ heißt: hat eine:n Spieler:in, also auch die eigenen Charaktere
function matchesFilter(c: RosterCharacter, filter: "all" | RosterStatus) {
  if (filter === "all") return true;
  if (filter === "taken") return c.status === "taken" || c.status === "mine";
  return c.status === filter;
}

function norm(s: string) {
  return s.toLocaleLowerCase("de");
}

function StatusChip({ c }: { c: RosterCharacter }) {
  if (c.status === "free") {
    return <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">{c.offer ? `Angeboten an ${c.offer.toName}` : "Frei, ohne Spieler:in"}</span>;
  }
  if (c.status === "taken") return <span className="rounded-full bg-surface-3 px-2 py-0.5 text-xs text-fg-soft">Gespielt von {c.ownerName ?? "?"}</span>;
  if (c.status === "review") return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.reviewStatus === "rejected" ? "bg-red-500/15 text-red-600 dark:text-red-400" : "bg-accent/15 text-accent"}`}>{c.reviewStatus === "rejected" ? "Abgelehnt" : "Zur Prüfung"}</span>;
  if (c.status === "mine") return <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-fg-soft">Dein Charakter</span>;
  return <span className="rounded-full bg-surface-3 px-2 py-0.5 text-xs text-fg-soft">NPC</span>;
}

// „Zu vergeben“ neben dem Stand: NPCs und Charaktere, die ihre Besitzer:in abgeben will
function OfferedChip({ c }: { c: RosterCharacter }) {
  if (!c.claimable || c.status === "free") return null;
  return <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">{c.offer ? `Angeboten an ${c.offer.toName}` : "Zu vergeben"}</span>;
}

// Alle Charaktere einer Welt als Übersicht: suchen, nach Stand und Wesen filtern, sortieren; für Admins mit Mitgliedern ohne Charakter
export function WorldRoster({
  characters,
  members,
  offerTargets,
  isAdmin,
  initialFilter = "all",
}: {
  characters: RosterCharacter[];
  members: RosterMember[];
  offerTargets: { id: string; name: string }[];
  isAdmin: boolean;
  initialFilter?: "all" | RosterStatus;
}) {
  const [filter, setFilter] = useState<"all" | RosterStatus>(initialFilter);
  const [species, setSpecies] = useState("");
  const [sort, setSort] = useState<"name" | "neu">("name");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [showMissing, setShowMissing] = useState(false);
  // Welche Karte ihre Vergabe-Optionen zeigt (immer nur eine)
  const [open, setOpen] = useState<string | null>(null);

  const counts = useMemo(() => {
    const m = new Map<string, number>([["all", characters.length]]);
    for (const c of characters) m.set(c.status, (m.get(c.status) ?? 0) + 1);
    m.set("taken", (m.get("taken") ?? 0) + (m.get("mine") ?? 0));
    return m;
  }, [characters]);
  const speciesOptions = useMemo(() => [...new Set(characters.map((c) => c.species).filter((s): s is string => !!s))].sort((a, b) => a.localeCompare(b, "de")), [characters]);
  const withoutCharacter = members.filter((m) => !m.hasCharacter);

  const q = norm(query.trim());
  const visible = useMemo(() => {
    const list = characters.filter((c) => {
      if (!matchesFilter(c, filter)) return false;
      if (species && c.species !== species) return false;
      if (q && !norm(c.name).includes(q) && !norm(c.ownerName ?? "").includes(q) && !norm(c.species ?? "").includes(q)) return false;
      return true;
    });
    return [...list].sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name, "de") : b.createdAt.localeCompare(a.createdAt)));
  }, [characters, filter, species, q, sort]);

  function reset(fn: () => void) {
    fn();
    setShown(PAGE);
  }

  return (
    <div className="flex flex-col gap-4">
      {isAdmin && (
        <div className="flex flex-wrap gap-2 text-sm">
          <button
            type="button"
            onClick={() => setShowMissing((v) => !v)}
            aria-expanded={showMissing}
            className={`rounded-full border px-3 py-1 transition ${withoutCharacter.length > 0 ? "border-accent/50 bg-accent/10 text-accent" : "border-line bg-surface text-fg-soft"}`}
          >
            <span className="font-semibold lining-nums tabular-nums">{withoutCharacter.length}</span> {withoutCharacter.length === 1 ? "Mitglied" : "Mitglieder"} ohne Charakter
          </button>
        </div>
      )}

      {isAdmin && showMissing && (
        <div className="rounded-2xl border border-line bg-surface p-3">
          {withoutCharacter.length === 0 ? (
            <p className="text-sm text-muted">Alle Mitglieder haben einen Charakter.</p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {withoutCharacter.map((m) => (
                <li key={m.id} className="rounded-full bg-surface-2 px-3 py-1 text-sm text-fg">
                  {m.name}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-muted">Biete ihnen einen freien Charakter an (Filter „Frei“, „Einer Person anbieten“).</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[11rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={2} />
          <input
            type="search"
            value={query}
            onChange={(e) => reset(() => setQuery(e.target.value))}
            placeholder="Name oder Wesen suchen"
            aria-label="Charakter, Spieler:in oder Wesen suchen"
            className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-sm text-fg outline-none focus:border-accent"
          />
        </label>
        {speciesOptions.length > 0 && (
          <select value={species} onChange={(e) => reset(() => setSpecies(e.target.value))} aria-label="Nach Wesen filtern" className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent">
            <option value="">Alle Wesen</option>
            {speciesOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}
        <select value={sort} onChange={(e) => setSort(e.target.value as "name" | "neu")} aria-label="Sortierung" className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent">
          <option value="name">A bis Z</option>
          <option value="neu">Neueste zuerst</option>
        </select>
      </div>

      <div role="tablist" aria-label="Stand" className="flex flex-wrap gap-1.5">
        {FILTERS.filter((f) => f.key === "all" || (counts.get(f.key) ?? 0) > 0).map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={filter === f.key}
            onClick={() => reset(() => setFilter(f.key))}
            className={`rounded-full border px-3 py-1 text-sm transition ${filter === f.key ? "border-accent bg-accent/10 font-medium text-accent" : "border-line text-fg-soft hover:border-accent hover:text-accent"}`}
          >
            {f.label} <span className="text-xs opacity-70">{counts.get(f.key) ?? 0}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted">Nichts gefunden.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.slice(0, shown).map((c) => {
            const hasOptions = c.canManage || (c.claimable && c.status !== "mine");
            const isOpen = open === c.id;
            const toggle = () => setOpen(isOpen ? null : c.id);
            return (
              <li key={c.id} className="rounded-2xl border border-line bg-surface">
                <div className="flex items-start gap-1 p-3">
                  <Link href={`/characters/${c.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <CharacterAvatar name={c.name} avatarUrl={c.avatarUrl} size={44} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-fg">{c.name}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        <StatusChip c={c} />
                        <AvailabilityBadge availability={c.availability} location={c.location} />
                        <OfferedChip c={c} />
                        {c.species && <span className="rounded-full border border-line px-2 py-0.5 text-xs text-fg-soft">{c.species}</span>}
                      </span>
                    </span>
                  </Link>
                  {hasOptions && (
                    <button
                      type="button"
                      onClick={toggle}
                      aria-expanded={isOpen}
                      aria-label={isOpen ? "Optionen schließen" : c.canManage ? "Vergabe-Optionen öffnen" : "Rolle anfragen"}
                      className="relative -mr-1 flex h-9 shrink-0 items-center gap-1 rounded-full px-2 text-fg-soft transition before:absolute before:-inset-1 hover:bg-surface-2 hover:text-accent"
                    >
                      {c.requestCount > 0 && c.canManage && (
                        <span className="rounded-full bg-accent px-1.5 text-xs font-semibold text-on-accent-strong lining-nums tabular-nums">{c.requestCount}</span>
                      )}
                      <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? "rotate-180" : ""}`} strokeWidth={2} />
                    </button>
                  )}
                </div>
                {c.status === "review" && (isAdmin || c.canManage) && (
                  <div className="px-3 pb-3">
                    <Link href={`/characters/${c.id}/pruefung`} className="inline-block rounded-full border border-line px-3 py-1 text-sm font-medium text-fg-soft transition hover:border-accent hover:text-accent">
                      {isAdmin ? "Prüfen" : "Zur Prüfung"}
                    </Link>
                  </div>
                )}
                {hasOptions && isOpen && (
                  <div className="border-t border-line px-3 py-3">
                    <NpcRoleActions
                      characterId={c.id}
                      claimable={c.claimable}
                      vacant={c.status === "free"}
                      isAdmin={c.canManage}
                      myRequestId={c.myRequestId}
                      offer={c.offer}
                      members={offerTargets}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {visible.length > shown && (
        <button type="button" onClick={() => setShown((n) => n + PAGE)} className="mx-auto rounded-full border border-line px-4 py-2 text-sm font-medium text-fg-soft transition hover:border-accent hover:text-accent">
          Mehr anzeigen ({visible.length - shown} weitere)
        </button>
      )}
    </div>
  );
}
