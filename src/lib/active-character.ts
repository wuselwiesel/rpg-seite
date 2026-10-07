import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_CHARACTER_COOKIE, type Character } from "@/lib/types";
import { getAcceptedFriends } from "@/lib/friends";

// cache() dedupliziert mehrfache Aufrufe innerhalb eines Requests (z.B. einmal
// aus der Sidebar, einmal aus der jeweiligen Seite) zu einer einzigen Abfrage.
// Eigene Charaktere ohne NPCs: Charakterwechsler, Feed, Chats usw. (NPCs: getOwnNpcs, getWorldNpcs).
export const getOwnCharacters = cache(async (userId: string, worldId: string): Promise<Character[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("characters")
    .select("*")
    .eq("owner_id", userId)
    .eq("world_id", worldId)
    .eq("is_npc", false)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  return data ?? [];
});

// NPCs, die man selbst angelegt hat (nur sie darf man in Szenen schreiben lassen).
export const getOwnNpcs = cache(async (userId: string, worldId: string): Promise<Character[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("characters")
    .select("*")
    .eq("owner_id", userId)
    .eq("world_id", worldId)
    .eq("is_npc", true)
    .is("deleted_at", null)
    .order("name")
    .returns<Character[]>();
  return data ?? [];
});

// Alle NPCs der Welt (für Mitglieder lesbar).
export const getWorldNpcs = cache(async (worldId: string): Promise<Character[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("characters").select("*").eq("world_id", worldId).eq("is_npc", true).is("deleted_at", null).order("name").returns<Character[]>();
  return data ?? [];
});

export const getActiveCharacter = cache(async (userId: string, worldId: string): Promise<Character | null> => {
  const characters = await getOwnCharacters(userId, worldId);
  if (characters.length === 0) return null;

  const cookieStore = await cookies();
  const activeId = cookieStore.get(ACTIVE_CHARACTER_COOKIE)?.value;

  return characters.find((c) => c.id === activeId) ?? characters[0];
});

// Charaktere, die man in einer Welt per @ erwähnen können soll: die eigenen
// sowie die aller Freund:innen (unabhängig davon, ob sie schon am Thread teilnehmen).
export const getMentionableCharacters = cache(async (userId: string, worldId: string): Promise<Character[]> => {
  const supabase = await createClient();
  const friends = await getAcceptedFriends(userId);
  const ownerIds = [userId, ...friends.map((f) => f.id)];

  // Außerdem alle NPCs der Welt: in @-Erwähnungen sollen sie auffindbar sein.
  const { data } = await supabase
    .from("characters")
    .select("*")
    .eq("world_id", worldId)
    .is("deleted_at", null)
    .or(`owner_id.in.(${ownerIds.join(",")}),is_npc.eq.true`)
    .order("name")
    .returns<Character[]>();

  return data ?? [];
});

// Alle (nicht gelöschten) Charaktere einer Welt, für die Auswahl „Mit dabei“; die eigenen zuerst, dann nach Name.
export const getWorldCharacters = cache(async (userId: string, worldId: string): Promise<Character[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("characters").select("*").eq("world_id", worldId).is("deleted_at", null).order("name").returns<Character[]>();
  const all = data ?? [];
  return [...all.filter((c) => c.owner_id === userId), ...all.filter((c) => c.owner_id !== userId)];
});
