"use client";

import { useEffect } from "react";
import { openInWorld } from "@/app/worlds/actions";

// Seite gehört zu einer anderen Welt als der aktiven: Welt wechseln und die Seite neu öffnen (lädt auch die Seitenleiste neu).
export function WorldSwitchRedirect({ worldId, path }: { worldId: string; path: string }) {
  useEffect(() => {
    void openInWorld(worldId, path);
  }, [worldId, path]);
  return null;
}
