"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { alertDialog } from "@/components/confirm-dialog";
import { joinAndRequestRole, requestCharacter } from "@/app/characters/claim-actions";
import { requestWorldJoin } from "../../join-actions";

const primary = "rounded-full bg-accent-strong px-3 py-1 text-sm font-medium text-on-accent-strong transition hover:opacity-90 disabled:opacity-50";
const quiet = "rounded-full border border-line px-3 py-1 text-sm font-medium text-fg-soft transition hover:border-accent hover:text-accent";

// Rolle aus der Vorschau anfragen: je nach Beitrittsart direkt (Mitglied), mit Beitritt (offene Welt) oder mit dem Beitrittsantrag (auf Anfrage)
export function PreviewRoleAction({
  worldId,
  characterId,
  isMember,
  joinMode,
  hasRequest,
}: {
  worldId: string;
  characterId: string;
  isMember: boolean;
  joinMode: "open" | "request" | "invite";
  hasRequest: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!isMember && joinMode === "invite") return <span className="text-xs text-muted">Beitritt nur auf Einladung</span>;
  if (done || (!isMember && joinMode === "request" && hasRequest)) {
    return <span className="rounded-full bg-surface-2 px-3 py-1 text-sm text-muted">{isMember ? "Angefragt" : "Beitritt angefragt"}</span>;
  }

  const label = isMember ? "Anfragen" : joinMode === "open" ? "Beitreten und anfragen" : "Beitritt mit dieser Rolle anfragen";

  function submit() {
    startTransition(async () => {
      let err: string | null;
      if (isMember) err = await requestCharacter(characterId, message);
      else if (joinMode === "open") err = await joinAndRequestRole(worldId, characterId, message);
      else err = await requestWorldJoin(worldId, message, characterId);
      if (err) {
        void alertDialog(err);
        return;
      }
      setDone(true);
      setOpen(false);
      // Wer beigetreten ist, landet auf der Weltseite (dort steht „Angefragt“)
      if (!isMember && joinMode === "open") router.push(`/worlds/${worldId}`);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {!open && (
        <button type="button" onClick={() => setOpen(true)} className={primary}>
          {label}
        </button>
      )}
      {open && (
        <form
          className="flex w-full min-w-[14rem] flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Nachricht an die Admins (optional)"
            className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent"
          />
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className={primary}>
              {pending ? "Sende …" : label}
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
