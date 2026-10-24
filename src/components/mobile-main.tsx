"use client";

import { usePathname } from "next/navigation";
import { isImmersiveChatPath } from "@/lib/immersive-routes";

// Hauptbereich. Früher mit weichem Seitenübergang (View Transitions); der ist aus: Brach der Browser einen Übergang
// wegen Zeitüberschreitung ab (langsamer Seitenwechsel, z. B. nach einem Weltwechsel), blieb ein altes Bild der Seite
// stehen (Feed der vorherigen Welt). Auf iPhone-Safari fror er außerdem gelegentlich die untere Leiste ein.
export function MobileMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const immersive = isImmersiveChatPath(pathname);

  return <main className={`min-w-0 flex-1 ${immersive ? "" : "pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0"}`}>{children}</main>;
}
