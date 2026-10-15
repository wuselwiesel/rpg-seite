"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { alertDialog } from "@/components/confirm-dialog";
import { offerCharacter, requestCharacter, setCharacterClaimable, withdrawCharacterClaim } from "./claim-actions";

const primary = "rounded-full bg-accent-strong px-3 py-1 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50";
const quiet = "rounded-full border border-line px-3 py-1 text-sm font-medium text-fg-soft transition hover:border-accent hover:text-accent disabled:opacity-50";

// Vergabe eines NPCs direkt in der NPC-Liste: Admins geben ihn frei oder bieten ihn an, Mitglieder fragen freie NPCs an
export function NpcRoleActions({
  characterId,
  claimable,
  isAdmin,
  myRequestId,
  offer,
  members,
}: {
  characterId: string;
  claimable: boolean;
  isAdmin: boolean;
  myRequestId: string | null;
  offer: { claimId: string; toName: string } | null;
  members: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState("");

  function run(fn: () => Promise<string | null>) {
    startTransition(async () => {
      const err = await fn();
      if (err) {
        void alertDialog(err);
        return;
      }
      setOpen(false);
      setMessage("");
      setTarget("");
      router.refresh();
    });
  }

  // Mitglieder: nur freigegebene NPCs lassen sich anfragen
  if (!isAdmin) {
    if (!claimable) return null;
    return (
      <div className="flex w-full flex-col gap-2">
        {myRequestId ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-surface-2 px-3 py-1 text-sm text-muted">Angefragt</span>
            <button type="button" disabled={pending} onClick={() => run(() => withdrawCharacterClaim(myRequestId))} className={quiet}>
              Zurückziehen
            </button>
          </div>
        ) : open ? (
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => requestCharacter(characterId, message));
            }}
          >
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} rows={2} placeholder="Warum möchtest du die Rolle? (optional)" className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent" />
            <div className="flex gap-2">
              <button type="submit" disabled={pending} className={primary}>
                Anfrage senden
              </button>
              <button type="button" onClick={() => setOpen(false)} className={quiet}>
                Abbrechen
              </button>
            </div>
          </form>
        ) : (
          <div>
            <button type="button" onClick={() => setOpen(true)} className={primary}>
              Anfragen
            </button>
          </div>
        )}
      </div>
    );
  }

  // Admins: freigeben (Mitglieder können anfragen) und direkt anbieten
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-fg-soft">
          <input
            type="checkbox"
            checked={claimable}
            disabled={pending}
            onChange={(e) => run(() => setCharacterClaimable(characterId, e.target.checked))}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          Zu vergeben
        </label>
        {offer ? (
          <>
            <span className="rounded-full bg-surface-2 px-3 py-1 text-sm text-muted">Angeboten an {offer.toName}</span>
            <button type="button" disabled={pending} onClick={() => run(() => withdrawCharacterClaim(offer.claimId))} className={quiet}>
              Zurückziehen
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setOpen((v) => !v)} className={quiet}>
            Einer Person anbieten
          </button>
        )}
      </div>
      {open && !offer && (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => offerCharacter(characterId, target, message));
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
            <button type="button" onClick={() => setOpen(false)} className={quiet}>
              Abbrechen
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
