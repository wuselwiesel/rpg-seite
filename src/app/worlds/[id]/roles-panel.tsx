"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CharacterAvatar } from "@/components/character-avatar";
import { alertDialog } from "@/components/confirm-dialog";
import { decideCharacterClaim, offerCharacter, requestCharacter, setCharacterClaimable, withdrawCharacterClaim } from "@/app/characters/claim-actions";

export type RoleCard = {
  id: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  species: string | null;
  // NPC oder Hauptcharakter; mine: gehört der angemeldeten Person
  isNpc: boolean;
  mine: boolean;
  // eigene offene Anfrage (Mitglied) bzw. offenes Angebot an jemanden (Admin)
  myRequestId: string | null;
  offer: { claimId: string; toName: string } | null;
  requests: { claimId: string; fromName: string; message: string }[];
};

export type OfferForMe = { claimId: string; characterId: string; characterName: string; avatarUrl: string | null; fromName: string; message: string };

const quiet = "rounded-full border border-line px-3 py-1 text-sm font-medium text-fg-soft transition hover:border-accent hover:text-accent disabled:opacity-50";
const primary = "rounded-full bg-accent-strong px-3 py-1 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50";

// Freie Rollen der Welt („Zu vergeben“), Anfragen für Admins und Angebote an die angemeldete Person
export function RolesPanel({
  isAdmin,
  roles,
  offersForMe,
  members,
}: {
  isAdmin: boolean;
  roles: RoleCard[];
  offersForMe: OfferForMe[];
  members: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState("");

  function run(fn: () => Promise<string | null>, after?: () => void) {
    startTransition(async () => {
      const err = await fn();
      if (err) {
        void alertDialog(err);
        return;
      }
      after?.();
      setOpen(null);
      setMessage("");
      setTarget("");
      router.refresh();
    });
  }

  // Vergeben darf, wem der Charakter gehört, und bei NPCs die Admins
  const canManage = (r: RoleCard) => r.mine || (isAdmin && r.isNpc);
  const allRequests = roles.filter(canManage).flatMap((r) => r.requests.map((q) => ({ ...q, role: r })));
  if (roles.length === 0 && offersForMe.length === 0) return null;

  return (
    <section aria-label="Rollen" data-tour="welt-rollen" className="mb-8 flex flex-col gap-4">
      {offersForMe.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-fg">Angebote für dich</h2>
          {offersForMe.map((o) => (
            <div key={o.claimId} className="flex flex-wrap items-center gap-3 rounded-2xl border border-accent/40 bg-accent/10 p-3">
              <Link href={`/characters/${o.characterId}`} className="flex min-w-0 flex-1 items-center gap-3">
                <CharacterAvatar name={o.characterName} avatarUrl={o.avatarUrl} size={44} />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-fg">{o.characterName}</span>
                  <span className="block text-xs text-muted">von {o.fromName}</span>
                  {o.message && <span className="mt-0.5 block text-sm text-fg-soft">{o.message}</span>}
                </span>
              </Link>
              <span className="flex shrink-0 gap-2">
                <button type="button" disabled={pending} onClick={() => run(() => decideCharacterClaim(o.claimId, true))} className={primary}>
                  Annehmen
                </button>
                <button type="button" disabled={pending} onClick={() => run(() => decideCharacterClaim(o.claimId, false))} className={quiet}>
                  Ablehnen
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      {allRequests.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="font-serif text-xl text-fg">Rollenanfragen</h2>
          {allRequests.map((q) => (
            <div key={q.claimId} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-3">
              <span className="min-w-0 flex-1 text-sm text-fg">
                <span className="font-medium">{q.fromName}</span> möchte <Link href={`/characters/${q.role.id}`} className="font-medium text-accent hover:underline">{q.role.name}</Link>
                {q.message && <span className="mt-0.5 block text-fg-soft">„{q.message}“</span>}
              </span>
              <span className="flex shrink-0 gap-2">
                <button type="button" disabled={pending} onClick={() => run(() => decideCharacterClaim(q.claimId, true))} className={primary}>
                  Geben
                </button>
                <button type="button" disabled={pending} onClick={() => run(() => decideCharacterClaim(q.claimId, false))} className={quiet}>
                  Ablehnen
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      {roles.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 data-tour="welt-zu-vergeben" className="font-serif text-xl text-fg">Zu vergeben</h2>
          <ul className="flex flex-col gap-2">
            {roles.map((r) => {
              const isOpen = open === r.id;
              return (
                <li key={r.id} className="rounded-2xl border border-line bg-surface p-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link href={`/characters/${r.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                      <CharacterAvatar name={r.name} avatarUrl={r.avatarUrl} size={48} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-fg">{r.name}</span>
                        {r.species && <span className="block text-xs text-muted">{r.species}</span>}
                        {r.bio && <span className="line-clamp-2 text-sm text-fg-soft">{r.bio}</span>}
                      </span>
                    </Link>
                    <span className="flex shrink-0 flex-wrap items-center gap-2">
                      {r.myRequestId ? (
                        <>
                          <span className="rounded-full bg-surface-2 px-3 py-1 text-sm text-muted">Angefragt</span>
                          <button type="button" disabled={pending} onClick={() => run(() => withdrawCharacterClaim(r.myRequestId!))} className={quiet}>
                            Zurückziehen
                          </button>
                        </>
                      ) : (
                        !canManage(r) && (
                          <button type="button" onClick={() => setOpen(isOpen ? null : r.id)} className={primary}>
                            Anfragen
                          </button>
                        )
                      )}
                      {canManage(r) && (
                        r.offer ? (
                          <>
                            <span className="rounded-full bg-surface-2 px-3 py-1 text-sm text-muted">Angeboten an {r.offer.toName}</span>
                            <button type="button" disabled={pending} onClick={() => run(() => withdrawCharacterClaim(r.offer!.claimId))} className={quiet}>
                              Zurückziehen
                            </button>
                          </>
                        ) : (
                          <button type="button" onClick={() => setOpen(isOpen ? null : r.id)} className={quiet}>
                            Anbieten
                          </button>
                        )
                      )}
                      {canManage(r) && (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => run(() => setCharacterClaimable(r.id, false))}
                          className="text-xs text-muted underline decoration-dotted underline-offset-2 hover:text-fg"
                        >
                          Nicht mehr anbieten
                        </button>
                      )}
                    </span>
                  </div>
                  {isOpen && (
                    <form
                      className="mt-3 flex flex-col gap-2 border-t border-line pt-3"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (canManage(r)) run(() => offerCharacter(r.id, target, message));
                        else run(() => requestCharacter(r.id, message));
                      }}
                    >
                      {canManage(r) && (
                        <select value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Person auswählen" required className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent">
                          <option value="">Person auswählen …</option>
                          {members.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      )}
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        maxLength={500}
                        rows={2}
                        placeholder={canManage(r) ? "Nachricht (optional)" : "Warum möchtest du die Rolle? (optional)"}
                        className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent"
                      />
                      <div className="flex gap-2">
                        <button type="submit" disabled={pending || (canManage(r) && !target)} className={primary}>
                          {canManage(r) ? "Anbieten" : "Anfrage senden"}
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
        </div>
      )}
    </section>
  );
}
