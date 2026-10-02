"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

// Welche Ordner/Seiten in der Wiki-Navigation aufgeklappt sind, pro Welt und Gerät gemerkt.
const EVENT = "wortwinkel:wiki-open";

function read(key: string): string {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

export function useOpenState(worldId: string) {
  const key = `wortwinkel:wiki-open:${worldId}`;
  const raw = useSyncExternalStore(
    (cb) => {
      window.addEventListener(EVENT, cb);
      window.addEventListener("storage", cb);
      return () => {
        window.removeEventListener(EVENT, cb);
        window.removeEventListener("storage", cb);
      };
    },
    () => read(key),
    () => "",
  );
  const state = useMemo<Record<string, boolean>>(() => {
    try {
      return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  }, [raw]);

  const save = useCallback(
    (next: Record<string, boolean>) => {
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* egal */
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [key],
  );

  return { state, save };
}

// Ob die Ordnerleiste am großen Bildschirm ausgeblendet ist (mehr Platz zum Lesen), pro Gerät gemerkt.
const NAV_KEY = "wortwinkel:wiki-nav-hidden";
const NAV_EVENT = "wortwinkel:wiki-nav";

export function useNavHidden() {
  const hidden = useSyncExternalStore(
    (cb) => {
      window.addEventListener(NAV_EVENT, cb);
      window.addEventListener("storage", cb);
      return () => {
        window.removeEventListener(NAV_EVENT, cb);
        window.removeEventListener("storage", cb);
      };
    },
    () => read(NAV_KEY) === "1",
    () => false,
  );
  const setHidden = useCallback((next: boolean) => {
    try {
      localStorage.setItem(NAV_KEY, next ? "1" : "0");
    } catch {
      /* egal */
    }
    window.dispatchEvent(new Event(NAV_EVENT));
  }, []);
  return { hidden, setHidden };
}
