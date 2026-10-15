import { BadgeCheck } from "lucide-react";
import { isVisibleSeal } from "@/lib/account-seals";

const LABELS: Record<string, string> = {
  builder: "App-Bastler:in",
  verified: "Verifiziert",
  official: "Offizielles Wortwinkel-Konto",
};

// Siegel neben einem Konto-Namen. Wird nur vom Betreiber vergeben (Tabelle account_marks), nie von Nutzer:innen.
export function AccountSeal({ kind }: { kind: string }) {
  const label = LABELS[kind];
  if (!label || !isVisibleSeal(kind)) return null;
  return (
    <span title={label} aria-label={label} role="img" className="inline-flex shrink-0 items-center self-center text-accent">
      <BadgeCheck className="h-[15px] w-[15px]" strokeWidth={2.25} />
    </span>
  );
}
