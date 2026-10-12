"use server";

import { createClient } from "@/lib/supabase/server";
import { autolinkHtml } from "@/lib/autolink";
import { getWikiTerms } from "@/lib/wiki-terms";
import { stripHtml } from "@/lib/strip-html";
import { snippetAround } from "@/lib/snippet";
import type { StoryEntry } from "@/lib/types";

// Frühere Beiträge einer langen Szene nachladen (die Seite lädt zuerst nur die neuesten) und in der Szene suchen.
// Wer eine Szene sehen darf, regelt die Datenbank (RLS); Kapitel liefert die Seite immer vollständig mit.

const ENTRIES_SELECT =
  "*, characters!story_entries_character_id_fkey(*), roll_target_character:roll_target_character_id(name)";
const PAGE = 50;
const UNTIL_MAX = 500;
const NOT_CHAPTER = "kind.is.null,kind.neq.chapter";

export type LoadedEntry = { entry: StoryEntry; displayHtml: string | null };
export type EarlierResult = { items: LoadedEntry[]; remaining: number } | { error: string };

// Beiträge vor `before` (aufsteigend); mit `until` alle bis einschließlich dieses Beitrags (z. B. für Sprünge und Suchtreffer).
export async function loadEarlierEntries(storyPostId: string, before: string, until?: string): Promise<EarlierResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };
  if (Number.isNaN(Date.parse(before))) return { error: "Ungültige Anfrage." };

  const { data: post } = await supabase.from("story_posts").select("world_id").eq("id", storyPostId).maybeSingle();
  if (!post) return { error: "Szene nicht gefunden." };

  let query = supabase
    .from("story_entries")
    .select(ENTRIES_SELECT)
    .eq("story_post_id", storyPostId)
    .or(NOT_CHAPTER)
    .lt("created_at", before)
    .order("created_at", { ascending: false });

  if (until) {
    const { data: target } = await supabase
      .from("story_entries")
      .select("created_at")
      .eq("id", until)
      .eq("story_post_id", storyPostId)
      .maybeSingle();
    if (target) query = query.gte("created_at", target.created_at).limit(UNTIL_MAX);
    else query = query.limit(PAGE);
  } else {
    query = query.limit(PAGE);
  }

  const { data, error } = await query.returns<StoryEntry[]>();
  if (error) return { error: error.message };
  const rows = (data ?? []).slice().reverse();

  const { count: older } = await supabase
    .from("story_entries")
    .select("id", { count: "exact", head: true })
    .eq("story_post_id", storyPostId)
    .or(NOT_CHAPTER)
    .lt("created_at", rows[0]?.created_at ?? before);

  const wikiTerms = await getWikiTerms(post.world_id);
  const items = rows.map((entry) => ({
    entry,
    displayHtml: entry.roll_label ? null : autolinkHtml(entry.content, { wiki: wikiTerms, tagHref: "/story" }),
  }));
  return { items, remaining: older ?? 0 };
}

export type SceneHit = { id: string; name: string; snippet: string; at: string };

// Volltextsuche in den Beiträgen einer Szene (neueste Treffer zuerst)
export async function searchSceneEntries(storyPostId: string, term: string): Promise<{ hits: SceneHit[] } | { error: string }> {
  const q = term.trim().slice(0, 80);
  if (q.length < 2) return { hits: [] };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const pattern = `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
  const { data, error } = await supabase
    .from("story_entries")
    .select("id, content, kind, created_at, characters!story_entries_character_id_fkey(name)")
    .eq("story_post_id", storyPostId)
    .ilike("content", pattern)
    .order("created_at", { ascending: false })
    .limit(40)
    .returns<{ id: string; content: string; kind: string | null; created_at: string; characters: { name: string } | null }[]>();
  if (error) return { error: error.message };

  const hits: SceneHit[] = [];
  for (const row of data ?? []) {
    const text = stripHtml(row.content);
    if (!text.toLowerCase().includes(q.toLowerCase())) continue; // Treffer nur in Markup
    hits.push({
      id: row.id,
      name: row.kind === "narrator" ? "Erzähler:in" : (row.characters?.name ?? "?"),
      snippet: snippetAround(text, q),
      at: row.created_at,
    });
  }
  return { hits };
}
