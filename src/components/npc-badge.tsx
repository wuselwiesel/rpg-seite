// Kleine Marke „NPC“ neben dem Namen eines Charakters ohne Spieler:in
export function NpcBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full bg-surface-2 px-2 py-0.5 align-middle text-[11px] font-semibold uppercase tracking-wide text-fg-soft ${className}`} title="NPC">
      NPC
    </span>
  );
}
