"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { setActiveCharacter } from "@/app/characters/actions";
import { characterPathAfterSwitch } from "@/lib/character-switch";

// Event, mit dem jede Stelle den Bogen „Du spielst“ öffnen kann (Charakter-Tab, Charakter-Chip im Chat, …)
export const WHO_OPEN_EVENT = "ww:who-open";
export const openWhoSheet = () => window.dispatchEvent(new Event(WHO_OPEN_EVENT));

type Switchable = { id: string; world_id: string };

// Wechselt zu einem eigenen Charakter. In derselben Welt bleibt man auf der Seite (Profil/ChaBo folgen dem neuen Charakter);
// liegt er in einer anderen Welt, setzt /switch-character beide Cookies und lädt neu.
export function useSwitchCharacter(all: Switchable[], activeWorldId: string | null) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();

  function switchTo(c: Switchable, after?: () => void) {
    const ownIds = all.map((x) => x.id);
    const target = characterPathAfterSwitch(pathname, ownIds, c.id);
    if (c.world_id !== activeWorldId) {
      after?.();
      // Route-Handler (setzt Cookies und leitet weiter): braucht einen echten Seitenaufruf, kein router.push
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(`/switch-character?character=${encodeURIComponent(c.id)}&next=${encodeURIComponent(target ?? "/")}`);
      return;
    }
    start(async () => {
      await setActiveCharacter(c.id);
      after?.();
      if (target) router.push(target);
      else router.refresh();
    });
  }

  // Profil eines eigenen Charakters öffnen (aus anderer Welt: vorher dorthin wechseln)
  function profileHref(c: Switchable) {
    return c.world_id === activeWorldId ? `/characters/${c.id}` : `/switch-character?character=${encodeURIComponent(c.id)}&next=${encodeURIComponent(`/characters/${c.id}`)}`;
  }

  return { switchTo, profileHref, pending };
}
