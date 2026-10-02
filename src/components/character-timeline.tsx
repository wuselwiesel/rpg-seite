import { ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { getCharacterBadges, visibleBadges } from "@/lib/badges-server";
import type { Character } from "@/lib/types";
import { EmojiText } from "./custom-emoji-provider";

type Event = { at: string; icon: string; text: string };

type RelRow = {
  id: string;
  character_a_id: string;
  character_b_id: string;
  a: { name: string } | null;
  b: { name: string } | null;
};

// Mini-Timeline des Charakters, automatisch aus Aktivitäten: Ankunft, Beitrags-Meilensteine, erste Story-Szene,
// Beziehungs-Entwicklungen und erhaltene Badges.
export async function CharacterTimeline({ character }: { character: Character }) {
  const supabase = await createClient();
  const events: Event[] = [
    {
      at: character.created_at,
      icon: "🌱",
      text: character.worlds?.name ? `Kam nach ${character.worlds.name}` : "Wurde angelegt",
    },
  ];

  const [{ data: posts }, { data: firstStory }, { data: rels }, badges] = await Promise.all([
    supabase
      .from("posts")
      .select("created_at")
      .eq("character_id", character.id)
      .lte("publish_at", new Date().toISOString())
      .order("created_at", { ascending: true })
      .limit(50),
    supabase
      .from("story_entries")
      .select("created_at")
      .eq("character_id", character.id)
      .order("created_at", { ascending: true })
      .limit(1),
    supabase
      .from("character_relationships")
      .select("id, character_a_id, character_b_id, a:character_a_id(name), b:character_b_id(name)")
      .or(`character_a_id.eq.${character.id},character_b_id.eq.${character.id}`)
      .returns<RelRow[]>(),
    getCharacterBadges(character.id).then(visibleBadges),
  ]);

  const list = posts ?? [];
  if (list[0]) events.push({ at: list[0].created_at, icon: "📝", text: "Erster Beitrag" });
  if (list[9]) events.push({ at: list[9].created_at, icon: "✍️", text: "10. Beitrag" });
  if (list[49]) events.push({ at: list[49].created_at, icon: "📚", text: "50. Beitrag" });
  if (firstStory?.[0]) events.push({ at: firstStory[0].created_at, icon: "📖", text: "Erste Szene in einer Story geschrieben" });

  if (rels?.length) {
    const { data: history } = await supabase
      .from("relationship_history")
      .select("relationship_id, type, created_at")
      .in("relationship_id", rels.map((r) => r.id))
      .order("created_at", { ascending: true });
    const byRel = new Map<string, { type: string; created_at: string }[]>();
    for (const h of history ?? []) byRel.set(h.relationship_id, [...(byRel.get(h.relationship_id) ?? []), h]);
    for (const r of rels) {
      const other = r.character_a_id === character.id ? r.b?.name : r.a?.name;
      const steps = byRel.get(r.id) ?? [];
      steps.forEach((step, i) => {
        events.push({
          at: step.created_at,
          icon: "🔗",
          text: i === 0 ? `Beziehung zu ${other ?? "?"}: ${step.type}` : `${other ?? "?"}: ${steps[i - 1].type} → ${step.type}`,
        });
      });
    }
  }

  for (const b of badges) events.push({ at: b.awardedAt, icon: b.icon, text: `Badge erhalten: ${b.name}` });

  const sorted = events.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);
  if (sorted.length < 2) return null;

  return (
    <details className="group mt-6 rounded-2xl border border-line">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-fg [&::-webkit-details-marker]:hidden">
        Verlauf
        <ChevronDown className="h-4 w-4 text-muted transition group-open:rotate-180" strokeWidth={2} />
      </summary>
      <ol className="relative mx-4 mb-4 flex flex-col gap-3 border-l-2 border-line pl-4">
        {sorted.map((e, i) => (
          <li key={i} className="relative text-sm">
            <span className="absolute -left-[1.55rem] top-0 flex h-5 w-5 items-center justify-center rounded-full bg-app text-xs">
              <EmojiText text={e.icon} />
            </span>
            <p className="text-fg">{e.text}</p>
            <p className="text-xs text-muted">{formatDate(e.at.slice(0, 10))}</p>
          </li>
        ))}
      </ol>
    </details>
  );
}
