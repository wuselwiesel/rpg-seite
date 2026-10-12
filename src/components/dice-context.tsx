"use client";

import { createContext, useContext } from "react";

// Ist das Würfeln in der aktiven Welt eingeschaltet? Steuert Navigation, Würfelreiter und ChaBo.
const DiceContext = createContext(true);

export function DiceProvider({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  return <DiceContext.Provider value={enabled}>{children}</DiceContext.Provider>;
}

export function useDiceEnabled(): boolean {
  return useContext(DiceContext);
}
