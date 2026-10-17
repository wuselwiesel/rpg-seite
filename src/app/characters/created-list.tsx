"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { CharacterAvatar } from "@/components/character-avatar";
import { alertDialog } from "@/components/confirm-dialog";
import { offerCharacter, setCharacterClaimable, withdrawCharacterClaim } from "./claim-actions";

export type CreatedStatus = "free" | "npc" | "assigned" | "mine";

export type CreatedCharacter = {
  id: string;
  name: string;
  avatarUrl: string | null;
  species: string | null;
  status: CreatedStatus;
  // Besitzer:in (bei „vergeben“) bzw. Person mit offenem Angebot
  ownerName: string | null;
  // Hauptcharakter (kein NPC); canManage: darf freigeben und anbieten
  isMain: boolean;
  // Zur Vergabe freigegeben (frei = ohne Spieler:in, oder ein NPC bzw. Charakter, den man abgeben will)
  claimable: boolean;
  canManage: boolean;
  offer: { claimId: string; toName: string } | null;
  requestCount: number;
};

const FILTERS: { key: "all" | CreatedStatus; label: string }[] = [
  { key: "all", label: "Alle" },
  { key: "free", label: "Frei" },
  { key: "assigned", label: "Vergeben" },
  { key: "mine", label: "Eigene" },
  { key: "npc", label: "NPCs" },
];

const quiet = "rounded-full border border-line px-3 py-1 text-sm font-medium text-fg-soft transition hover:border-accent hover:text-accent disabled:opacity-50";
const primary = "rounded-full bg-accent-strong px-3 py-1 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50";

function StatusChip({ c }: { c: CreatedCharacter }) {
  if (c.status === "free") {
    return c.offer ? (
      <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">Angeboten an {c.offer.toName}</span>
    ) : (
      <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">Frei, ohne Spieler:in</span>
    );
  }
  const offered = c.claimable ? <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">{c.offer ? `Angeboten an ${c.offer.toName}` : "Zu vergeben"}</span> : null;
  if (c.status === "assigned") return <span className="rounded-full bg-surface-3 px-2 py-0.5 text-xs text-fg-soft">Vergeben an {c.ownerName ?? "?"}</span>;
  const base =
    c.status === "mine" ? (
      <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-fg-soft">Eigener Charakter</span>
    ) : (
      <span className="rounded-full bg-surface-3 px-2 py-0.5 text-xs text-fg-soft">NPC</span>
    );
  return (
    <>
      {base}
      {offered}
    </>
  );
}

// Alle von mir angelegten Charaktere der Welt mit Stand der Vergabe (frei, vergeben, eigen, NPC) und den passenden Aktionen
export function CreatedList({
  items,
  members,
  worldId,
}: {
  items: CreatedCharacter[];
  members: { id: string; name: string }[];
  worldId: string;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | CreatedStatus>("all");
  const [open, setOpen] = useState<string | null>(null);
  // Welche Karte ihre Vergabe-Aktionen zeigt
  const [menu, setMenu] = useState<string | null>(null);
  const [target, setTarget] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  const counts = new Map<string, number>([["all", items.length]]);
  for (const i of items) counts.set(i.status, (counts.get(i.status) ?? 0) + 1);
  const visible = items.filter((i) => filter === "all" || i.status === filter);

  function run(fn: () => Promise<string | null>) {
    startTransition(async () => {
      const err = await fn();
      if (err) {
        void alertDialog(err);
        return;
      }
      setOpen(null);
      setTarget("");
      setMessage("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Filter" className="flex flex-wrap gap-1.5">
        {FILTERS.filter((f) => f.key === "all" || (counts.get(f.key) ?? 0) > 0).map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full border px-3 py-1 text-sm transition ${
              filter === f.key ? "border-accent bg-accent/10 font-medium text-accent" : "border-line text-fg-soft hover:border-accent hover:text-accent"
            }`}
          >
            {f.label} <span className="text-xs opacity-70">{counts.get(f.key) ?? 0}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted">Hier ist nichts.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((c) => {
            const isOpen = open === c.id;
            const menuOpen = menu === c.id;
            return (
              <li key={c.id} className="rounded-2xl border border-line bg-surface p-3">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-1">
                  <Link href={`/characters/${c.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <CharacterAvatar name={c.name} avatarUrl={c.avatarUrl} size={44} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-fg">{c.name}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        <StatusChip c={c} />
                        {c.species && <span className="rounded-full border border-line px-2 py-0.5 text-xs text-fg-soft">{c.species}</span>}
                      </span>
                    </span>
                  </Link>
                    {c.canManage && (
                      <button
                        type="button"
                        onClick={() => setMenu(menuOpen ? null : c.id)}
                        aria-expanded={menuOpen}
                        aria-label={menuOpen ? "Optionen schließen" : "Vergabe-Optionen öffnen"}
                        className="relative -mr-1 flex h-9 shrink-0 items-center rounded-full px-2 text-fg-soft transition before:absolute before:-inset-1 hover:bg-surface-2 hover:text-accent"
                      >
                        <ChevronDown className={`h-5 w-5 transition-transform ${menuOpen ? "rotate-180" : ""}`} strokeWidth={2} />
                      </button>
                    )}
                  </div>
                  <span className="flex flex-wrap items-center gap-2">
                    {c.requestCount > 0 && (
                      <Link href={`/worlds/${worldId}`} className="rounded-full border border-accent/50 bg-accent/10 px-3 py-1 text-sm font-medium text-accent">
                        {c.requestCount} {c.requestCount === 1 ? "Anfrage" : "Anfragen"}
                      </Link>
                    )}
                    {menuOpen && c.canManage && (c.status === "free" || c.claimable) && (
                      <>
                        {c.offer ? (
                          <button type="button" disabled={pending} onClick={() => run(() => withdrawCharacterClaim(c.offer!.claimId))} className={quiet}>
                            Angebot zurückziehen
                          </button>
                        ) : (
                          <button type="button" onClick={() => setOpen(isOpen ? null : c.id)} className={primary}>
                            Einer Person anbieten
                          </button>
                        )}
                        {c.status !== "free" && (
                          <button type="button" disabled={pending} onClick={() => run(() => setCharacterClaimable(c.id, false))} className={quiet}>
                            Nicht mehr zu vergeben
                          </button>
                        )}
                      </>
                    )}
                    {menuOpen && (c.status === "npc" || c.status === "mine") && c.canManage && !c.claimable && (
                      <>
                        <button type="button" disabled={pending} onClick={() => run(() => setCharacterClaimable(c.id, true))} className={primary}>
                          Zur Vergabe freigeben
                        </button>
                        {!c.offer && (
                          <button type="button" onClick={() => setOpen(isOpen ? null : c.id)} className={quiet}>
                            Einer Person anbieten
                          </button>
                        )}
                      </>
                    )}
                  </span>
                </div>
                {isOpen && (
                  <form
                    className="mt-3 flex flex-col gap-2 border-t border-line pt-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      run(() => offerCharacter(c.id, target, message));
                    }}
                  >
                    <select value={target} onChange={(e) => setTarget(e.target.value)} required aria-label="Person auswählen" className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent">
                      <option value="">Person auswählen …</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                    <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} rows={2} placeholder="Nachricht (optional)" className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent" />
                    <div className="flex gap-2">
                      <button type="submit" disabled={pending || !target} className={primary}>
                        Angebot senden
                      </button>
                      <button type="button" onClick={() => setOpen(null)} className={quiet}>
                        Abbrechen
                      </button>
                    </div>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
