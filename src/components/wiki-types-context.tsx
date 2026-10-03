"use client";

import { createContext, useContext } from "react";
import { BUILTIN_WIKI_TYPES, type WikiType } from "@/lib/wiki-types";

// Die Seitenarten der aktuellen Welt für alle Wiki-Seiten (der Wiki-Rahmen stellt sie bereit).
const WikiTypesContext = createContext<WikiType[]>(BUILTIN_WIKI_TYPES);

export function WikiTypesProvider({ types, children }: { types: WikiType[]; children: React.ReactNode }) {
  return <WikiTypesContext.Provider value={types}>{children}</WikiTypesContext.Provider>;
}

export function useWikiTypes(): WikiType[] {
  return useContext(WikiTypesContext);
}
