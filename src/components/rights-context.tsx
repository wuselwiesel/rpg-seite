"use client";

import { createContext, useContext } from "react";
import { FULL_RIGHTS, type WorldRights } from "@/lib/world-permissions";

// Rechte der angemeldeten Person in der aktiven Welt (Rechte-Tabelle): steuert, welche Knöpfe erscheinen.
const RightsContext = createContext<WorldRights>(FULL_RIGHTS);

export function RightsProvider({ rights, children }: { rights: WorldRights; children: React.ReactNode }) {
  return <RightsContext.Provider value={rights}>{children}</RightsContext.Provider>;
}

export function useWorldRights(): WorldRights {
  return useContext(RightsContext);
}
