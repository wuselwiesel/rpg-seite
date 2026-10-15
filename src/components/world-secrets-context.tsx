"use client";

import { createContext, useContext, type ReactNode } from "react";

// Sind geheime Felder in der aktuellen Welt erlaubt? Formulare blenden den Geheim-Schalter sonst aus (außer bei bereits Geheimem).
const WorldSecretsContext = createContext(true);

export function WorldSecretsProvider({ allowed, children }: { allowed: boolean; children: ReactNode }) {
  return <WorldSecretsContext.Provider value={allowed}>{children}</WorldSecretsContext.Provider>;
}

export function useAllowSecrets(): boolean {
  return useContext(WorldSecretsContext);
}
