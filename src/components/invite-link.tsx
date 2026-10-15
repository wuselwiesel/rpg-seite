"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { getInviteToken, renewInviteToken } from "@/app/worlds/actions";
import { alertDialog, confirmDialog } from "@/components/confirm-dialog";

// Kopiert den Einladungslink einer Welt. Der Link trägt einen Schlüssel: Damit tritt man auch einer Welt „Nur auf Einladung“
// oder „Auf Anfrage“ direkt bei. „Neuen Link erzeugen“ macht den bisherigen ungültig.
export function InviteLink({ worldId }: { worldId: string }) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  async function copy(renew: boolean) {
    if (renew) {
      const ok = await confirmDialog({
        message: "Der bisherige Einladungslink funktioniert danach nicht mehr. Neuen Link erzeugen?",
        confirmLabel: "Neuen Link erzeugen",
        danger: true,
      });
      if (!ok) return;
    }
    setBusy(true);
    const result = renew ? await renewInviteToken(worldId) : await getInviteToken(worldId);
    setBusy(false);
    if ("error" in result) {
      void alertDialog(result.error);
      return;
    }
    const url = `${window.location.origin}/worlds/join/${worldId}?t=${result.token}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Link kopieren:", url);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={busy}
        onClick={() => copy(false)}
        className="flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm font-medium text-fg-soft transition hover:border-accent hover:text-accent disabled:opacity-50"
      >
        {copied ? <Check className="h-4 w-4 text-accent" strokeWidth={2} /> : <Link2 className="h-4 w-4" strokeWidth={2} />}
        {copied ? "Link kopiert" : "Einladungslink kopieren"}
      </button>
      <button type="button" disabled={busy} onClick={() => copy(true)} className="text-xs text-muted underline decoration-dotted underline-offset-2 hover:text-fg disabled:opacity-50">
        Neuen Link erzeugen
      </button>
    </div>
  );
}
