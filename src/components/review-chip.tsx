import Link from "next/link";

// Marke „Zur Prüfung“ / „Abgelehnt“ / „Genehmigt“ bzw. Zugang zur Prüfseite (nur für Besitzer:in und Admins sichtbar eingebunden)
export function ReviewChip({ characterId, status, openProposals = 0, admin }: { characterId: string; status: "pending" | "approved" | "rejected"; openProposals?: number; admin: boolean }) {
  if (status === "approved" && openProposals === 0 && !admin) return null;
  const label = status === "pending" ? "Zur Prüfung" : status === "rejected" ? "Abgelehnt" : openProposals > 0 ? "Vorschläge" : "Genehmigt";
  const tone = status === "rejected" ? "bg-red-500/15 text-red-600 dark:text-red-400" : status === "pending" || openProposals > 0 ? "bg-accent/15 text-accent" : "bg-surface-2 text-fg-soft";
  return (
    <Link href={`/characters/${characterId}/pruefung`} className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition hover:opacity-80 ${tone}`}>
      {label}
      {openProposals > 0 && <span className="rounded-full bg-accent px-1.5 text-[10px] text-on-accent-strong">{openProposals}</span>}
    </Link>
  );
}
