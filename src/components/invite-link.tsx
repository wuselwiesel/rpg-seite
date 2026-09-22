"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";

// Kopiert den Einladungslink einer Welt: angemeldete Freund:innen treten damit direkt bei,
// ohne dass sie erst manuell zur Mitgliederliste hinzugefügt werden müssen.
export function InviteLink({ worldId }: { worldId: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}/worlds/join/${worldId}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Link kopieren:", url);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm font-medium text-fg-soft transition hover:border-accent hover:text-accent"
    >
      {copied ? <Check className="h-4 w-4 text-accent" strokeWidth={2} /> : <Link2 className="h-4 w-4" strokeWidth={2} />}
      {copied ? "Link kopiert" : "Einladungslink kopieren"}
    </button>
  );
}
