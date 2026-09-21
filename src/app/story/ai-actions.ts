"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { stripHtml } from "@/lib/strip-html";
import type { StoryEntry, StoryPost } from "@/lib/types";

// Kostenlose KI-Zusammenfassung. Bevorzugt Groq (GROQ_API_KEY, kein Bezahl-Konto nötig), sonst Google Gemini (GEMINI_API_KEY).
const GROQ_MODELS = [process.env.GROQ_MODEL, "llama-3.3-70b-versatile", "llama-3.1-8b-instant"].filter(
  (m): m is string => Boolean(m),
);
const GEMINI_MODELS = [process.env.GEMINI_MODEL, "gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"].filter(
  (m): m is string => Boolean(m),
);
const MAX_INPUT_CHARS = 14000;

export type SummaryResult = { summary: string | null; count: number | null; error: string | null };

type Answer = { text: string | null; error: string | null };

async function askGroq(prompt: string, apiKey: string): Promise<Answer> {
  let lastError = "Die KI hat nicht geantwortet.";
  for (const model of GROQ_MODELS) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.4,
          max_tokens: 500,
        }),
        signal: AbortSignal.timeout(25000),
      });
      if (res.status === 429) return { text: null, error: "Gerade zu viele Anfragen an die KI. Versuch es in einer Minute erneut." };
      if (res.status === 401 || res.status === 403) return { text: null, error: "Der KI-Schlüssel wird nicht akzeptiert." };
      if (res.status === 404 || res.status === 400) {
        lastError = "Das KI-Modell ist nicht verfügbar.";
        continue; // nächstes Modell probieren
      }
      if (!res.ok) {
        lastError = "Die KI ist gerade nicht erreichbar.";
        continue;
      }
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = json.choices?.[0]?.message?.content?.trim();
      if (text) return { text, error: null };
      lastError = "Die KI hat keine Zusammenfassung geliefert.";
    } catch {
      lastError = "Die KI ist gerade nicht erreichbar.";
    }
  }
  return { text: null, error: lastError };
}

async function askGemini(prompt: string, apiKey: string): Promise<Answer> {
  let lastError = "Die KI hat nicht geantwortet.";
  for (const model of GEMINI_MODELS) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 500 },
        }),
        signal: AbortSignal.timeout(25000),
      });
      if (res.status === 429) return { text: null, error: "Gerade zu viele Anfragen an die KI. Versuch es in einer Minute erneut." };
      if (res.status === 400 || res.status === 403) return { text: null, error: "Der KI-Schlüssel wird nicht akzeptiert." };
      if (res.status === 404) {
        lastError = "Das KI-Modell ist nicht verfügbar.";
        continue; // nächstes Modell probieren
      }
      if (!res.ok) {
        lastError = "Die KI ist gerade nicht erreichbar.";
        continue;
      }
      const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
      if (text) return { text, error: null };
      lastError = "Die KI hat keine Zusammenfassung geliefert.";
    } catch {
      lastError = "Die KI ist gerade nicht erreichbar.";
    }
  }
  return { text: null, error: lastError };
}

export async function summarizeScene(storyPostId: string): Promise<SummaryResult> {
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!groqKey && !geminiKey) return { summary: null, count: null, error: "Die KI-Zusammenfassung ist noch nicht eingerichtet." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { summary: null, count: null, error: "Nicht angemeldet." };

  const { data: post } = await supabase
    .from("story_posts")
    .select("*, characters!story_posts_character_id_fkey(name)")
    .eq("id", storyPostId)
    .maybeSingle<StoryPost & { characters: { name: string } | null }>();
  if (!post) return { summary: null, count: null, error: "Szene nicht gefunden." };
  // Geheime Szenen verlassen die App nicht.
  if (post.is_private) return { summary: null, count: null, error: "Geheime Szenen werden nicht an die KI gesendet." };

  const { data: entries } = await supabase
    .from("story_entries")
    .select("kind, content, roll_label, characters!story_entries_character_id_fkey(name)")
    .eq("story_post_id", storyPostId)
    .order("created_at", { ascending: true })
    .returns<Pick<StoryEntry, "kind" | "content" | "roll_label" | "characters">[]>();

  const writing = (entries ?? []).filter((e) => e.kind !== "chapter" && !e.roll_label);
  const count = writing.length;

  // Schon aktuell? Dann keine neue Anfrage.
  if (post.ai_summary && post.ai_summary_count === count) {
    return { summary: post.ai_summary, count, error: null };
  }

  const lines = [
    `${post.narrator ? "Erzähler:in" : (post.characters?.name ?? "?")}: ${stripHtml(post.title)}. ${stripHtml(post.content)}`,
    ...writing.map((e) => `${e.kind === "narrator" ? "Erzähler:in" : (e.characters?.name ?? "?")}: ${stripHtml(e.content)}`),
  ];
  let story = lines.join("\n\n");
  if (story.length > MAX_INPUT_CHARS) {
    story = `${story.slice(0, MAX_INPUT_CHARS / 3)}\n[…]\n${story.slice(-(MAX_INPUT_CHARS * 2) / 3)}`;
  }

  const prompt =
    "Fasse die folgende Szene aus einem Text-Rollenspiel auf Deutsch zusammen, damit Mitspielende schnell wieder im Bild sind. " +
    "Schreibe 3 bis 5 Sätze im Präsens, nenne wichtige Figuren beim Namen und sage, wo die Handlung gerade steht. " +
    "Erfinde nichts dazu, keine Bewertung, keine Einleitung wie „Zusammenfassung“.\n\n" +
    `Szene „${post.title}“:\n\n${story}`;

  const { text, error } = groqKey ? await askGroq(prompt, groqKey) : await askGemini(prompt, geminiKey!);
  if (!text) return { summary: null, count: null, error };

  const { error: saveError } = await supabase.rpc("set_story_summary", {
    p_story_post_id: storyPostId,
    p_summary: text,
    p_count: count,
  });
  if (saveError) return { summary: text, count, error: null };

  revalidatePath(`/story/${storyPostId}`);
  return { summary: text, count, error: null };
}
