import { ChevronDown, Network } from "lucide-react";
import { NoteLinkChip } from "./note-link-chip";
import type { Connection } from "@/lib/notes-data";

// „Verbindungen“ am eigenen Charakter: was in den eigenen Notizen mit ihm zusammen verknüpft ist (nur für dich sichtbar)
export function CharacterConnections({ connections }: { connections: Connection[] }) {
  if (connections.length === 0) return null;
  return (
    <details className="group/conn mt-1 -ml-1.5">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-full px-1.5 py-0.5 text-xs text-muted/80 transition hover:bg-surface-2 hover:text-fg [&::-webkit-details-marker]:hidden">
        <Network className="h-3.5 w-3.5" strokeWidth={2} />
        Verbindungen
        <span className="tabular-nums">{connections.length}</span>
        <ChevronDown className="h-3 w-3 transition group-open/conn:rotate-180" strokeWidth={2} />
      </summary>
      <div className="mt-1.5 flex flex-wrap gap-1.5 px-1.5">
        {connections.map((c) => (
          <NoteLinkChip key={c.link.id} link={c.link}>
            {c.count > 1 && <span className="mr-1.5 text-[11px] tabular-nums text-muted">×{c.count}</span>}
          </NoteLinkChip>
        ))}
      </div>
    </details>
  );
}
