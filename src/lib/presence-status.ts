"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export const PRESENCE_STATUSES = [
  { id: "thinking", chip: "denkt nach", label: "denkt gerade nach…" },
  { id: "brb", chip: "kurz weg", label: "ist kurz weg" },
  { id: "afk", chip: "AFK", label: "ist AFK" },
  { id: "offline", chip: "offline", label: "ist offline" },
] as const;

export type PresenceStatusId = (typeof PRESENCE_STATUSES)[number]["id"];

export function presenceLabel(id: string): string | null {
  return PRESENCE_STATUSES.find((s) => s.id === id)?.label ?? null;
}

export const CUSTOM_STATUS_MAX = 40;

export type PresenceEntry = { name: string; text: string };

type PresencePayload = { characterId: string; name: string; status: PresenceStatusId | null; custom?: string | null };

function cleanCustom(v: unknown): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, CUSTOM_STATUS_MAX) : "";
}

const SAVED_KEY = "wortwinkel:status-saved";
const SAVED_MAX = 6;
const statusKey = (characterId: string) => `wortwinkel:status:${characterId}`;

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* egal */
  }
}

// Teilt den eigenen Status ("AFK", "denkt nach" …) mit allen, die denselben Raum offen haben.
// Der Status verschwindet automatisch, wenn die Seite geschlossen wird (Supabase Presence).
// Mit `persist` wird er pro Charakter auf dem Gerät gemerkt und beim nächsten Öffnen wieder gesetzt, bis man ihn entfernt.
// `pauseFor(ms)` blendet ihn kurz aus (z. B. während man schreibt oder würfelt) und setzt ihn danach von selbst wieder.
export function usePresenceStatus(room: string, me: { characterId: string; name: string }, options?: { persist?: boolean }) {
  const persist = options?.persist ?? false;
  const [myStatus, setMyStatus] = useState<PresenceStatusId | null>(null);
  const [myCustom, setMyCustom] = useState("");
  const [suspended, setSuspended] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  // Für welchen Charakter der gespeicherte Status schon geladen wurde (verhindert Überschreiben vor dem Laden).
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [others, setOthers] = useState<Record<string, PresenceEntry>>({});
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`presence-${room}`);
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresencePayload>();
        const next: Record<string, PresenceEntry> = {};
        for (const entries of Object.values(state)) {
          for (const e of entries) {
            const custom = cleanCustom(e.custom);
            const text = (custom ? `– ${custom}` : null) || (e.status ? presenceLabel(e.status) : null);
            if (text) next[e.characterId] = { name: e.name, text };
          }
        }
        setOthers(next);
      })
      .subscribe((s) => {
        if (s === "SUBSCRIBED") setReady(true);
      });
    channelRef.current = channel;
    return () => {
      channelRef.current = null;
      setReady(false);
      supabase.removeChannel(channel);
    };
  }, [room]);

  // Gemerkten Status des (gewählten) Charakters laden, sobald es einen gibt bzw. der Charakter wechselt.
  useEffect(() => {
    if (!persist) return;
    const stored = readJson<{ status?: string | null; custom?: string | null }>(statusKey(me.characterId));
    const known = PRESENCE_STATUSES.some((p) => p.id === stored?.status);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMyStatus(known ? (stored!.status as PresenceStatusId) : null);
    setMyCustom(cleanCustom(stored?.custom));
    const list = readJson<string[]>(SAVED_KEY);
    setSaved(Array.isArray(list) ? list.map(cleanCustom).filter(Boolean).slice(0, SAVED_MAX) : []);
    setLoadedFor(me.characterId);
  }, [persist, me.characterId]);

  useEffect(() => {
    if (!persist || loadedFor !== me.characterId) return;
    writeJson(statusKey(me.characterId), myStatus || myCustom ? { status: myStatus, custom: myCustom || null } : null);
  }, [persist, loadedFor, me.characterId, myStatus, myCustom]);

  useEffect(
    () => () => {
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    },
    [],
  );

  // Während man schreibt/würfelt, sieht man statt des Status die Schreib-Anzeige; danach kommt er wieder.
  useEffect(() => {
    if (!ready) return;
    channelRef.current?.track({
      characterId: me.characterId,
      name: me.name,
      status: suspended ? null : myStatus,
      custom: suspended ? null : cleanCustom(myCustom) || null,
    } satisfies PresencePayload);
  }, [ready, me.characterId, me.name, myStatus, myCustom, suspended]);

  const pauseFor = useCallback((ms: number) => {
    setSuspended(true);
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setSuspended(false), ms);
  }, []);

  const forgetSaved = useCallback((text: string) => {
    setSaved((cur) => {
      const next = cur.filter((t) => t !== text);
      writeJson(SAVED_KEY, next);
      return next;
    });
  }, []);

  // Vorgegebener Status und eigener Text schließen sich aus.
  const toggle = useCallback((id: PresenceStatusId) => {
    setMyCustom("");
    setMyStatus((cur) => (cur === id ? null : id));
  }, []);
  const clear = useCallback(() => {
    setMyCustom("");
    setMyStatus(null);
  }, []);
  const setCustom = useCallback(
    (text: string) => {
      const clean = cleanCustom(text);
      setMyCustom(clean);
      setMyStatus(null);
      // Eigene Texte merken, damit man sie später mit einem Klick wieder setzen kann.
      if (persist && clean) {
        setSaved((cur) => {
          const next = [clean, ...cur.filter((t) => t !== clean)].slice(0, SAVED_MAX);
          writeJson(SAVED_KEY, next);
          return next;
        });
      }
    },
    [persist],
  );

  return {
    myStatus,
    myCustom,
    suspended,
    saved,
    pauseFor,
    forgetSaved,
    toggle,
    setCustom,
    clear,
    others: Object.fromEntries(Object.entries(others).filter(([cid]) => cid !== me.characterId)),
  };
}
