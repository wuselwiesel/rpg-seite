import Link from "next/link";
import { ChevronLeft } from "lucide-react";

// Titel einer Einstellungs-Unterseite; auf dem Handy mit Zurück-Pfeil zur Liste.
export function SettingsHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <Link
        href="/profile"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted transition hover:text-fg lg:hidden"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        Einstellungen
      </Link>
      <h2 className="font-serif text-2xl text-fg">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </div>
  );
}
