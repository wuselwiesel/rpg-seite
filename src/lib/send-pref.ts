"use client";

import { useSyncExternalStore } from "react";

// Pro Gerät: Soll die Enter-Taste Nachrichten abschicken (Umschalt+Enter = neue Zeile) oder eine neue Zeile
// einfügen (abschicken dann mit Strg/Cmd+Enter)? Gilt nur mit Maus/Tastatur; am Handy bleibt Enter = neue Zeile.
export const ENTER_SENDS_KEY = "wortwinkel:enter-sends";
export const ENTER_SENDS_EVENT = "wortwinkel:enter-sends-change";

export function readEnterSends(): boolean {
  try {
    return localStorage.getItem(ENTER_SENDS_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setEnterSends(on: boolean) {
  try {
    localStorage.setItem(ENTER_SENDS_KEY, on ? "on" : "off");
  } catch {
    /* egal */
  }
  window.dispatchEvent(new Event(ENTER_SENDS_EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener(ENTER_SENDS_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(ENTER_SENDS_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function useEnterSends(): boolean {
  return useSyncExternalStore(subscribe, readEnterSends, () => true);
}

// Ist das die Taste, die die Nachricht abschicken soll? Strg/Cmd+Enter schickt immer ab.
export function isSendKey(
  e: { key: string; shiftKey: boolean; ctrlKey: boolean; metaKey: boolean; altKey: boolean; nativeEvent?: { isComposing?: boolean } },
  enterSends: boolean,
): boolean {
  if (e.key !== "Enter" || e.nativeEvent?.isComposing) return false;
  if (e.ctrlKey || e.metaKey) return true;
  return enterSends && !e.shiftKey && !e.altKey && window.matchMedia("(pointer: fine)").matches;
}
