"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Gemeinsame Leiste aller Verwaltungsseiten einer Welt (nur für Besitzer:in und Admins sichtbar eingebunden)
export function WorldAdminTabs({ worldId }: { worldId: string }) {
  const pathname = usePathname();
  // Auswahllisten gehören zu den Einstellungen (dort ist der Abschnitt „Auswahllisten“); die Seite bleibt unter „Einstellungen“ markiert
  const tabs = [
    { href: `/worlds/${worldId}`, label: "Welt", also: [] as string[] },
    { href: `/worlds/${worldId}/uebersicht`, label: "Übersicht", also: [] },
    { href: `/worlds/${worldId}/charaktere`, label: "Charaktere", also: [] },
    { href: `/worlds/${worldId}/edit`, label: "Einstellungen", also: [`/worlds/${worldId}/listen`] },
  ];
  return (
    <nav aria-label="Welt verwalten" data-tour="welt-verwaltung" className="-mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0">
      {tabs.map((t) => {
        const active = pathname === t.href || t.also.includes(pathname ?? "");
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition ${
              active ? "border-accent text-accent" : "border-transparent text-fg-soft hover:text-fg"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
