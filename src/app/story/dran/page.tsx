import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { CharacterAvatar } from "@/components/character-avatar";
import { timeAgoShort } from "@/lib/format";

export const metadata = { title: "Wer ist dran" };

type Row = {
  id: string;
  title: string;
  turn_set_at: string | null;
  turn_character_id: string;
  is_private: boolean;
  turn: { id: string; name: string; avatar_url: string | null; owner_id: string } | null;
};

// Alle offenen Szenen der Welt, nach Figur gruppiert: wer ist dran und wie lange schon.
export default async function WhoseTurnPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const world = await getActiveWorld(user.id);
  if (!world) redirect("/worlds");

  const { data } = await supabase
    .from("story_posts")
    .select("id, title, turn_set_at, turn_character_id, is_private, turn:characters!story_posts_turn_character_id_fkey(id, name, avatar_url, owner_id)")
    .eq("world_id", world.id)
    .eq("archived", false)
    .eq("locked", false)
    .not("turn_character_id", "is", null)
    .order("turn_set_at", { ascending: true, nullsFirst: true })
    .limit(500)
    .returns<Row[]>();

  const groups = new Map<string, { character: NonNullable<Row["turn"]>; scenes: Row[] }>();
  for (const row of data ?? []) {
    if (!row.turn) continue;
    const g = groups.get(row.turn.id) ?? { character: row.turn, scenes: [] };
    g.scenes.push(row);
    groups.set(row.turn.id, g);
  }
  // Eigene Figuren zuerst, sonst wer am längsten wartet
  const list = Array.from(groups.values()).sort((a, b) => {
    const mine = Number(b.character.owner_id === user.id) - Number(a.character.owner_id === user.id);
    if (mine) return mine;
    return (a.scenes[0].turn_set_at ?? "").localeCompare(b.scenes[0].turn_set_at ?? "");
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/story" className="mb-4 flex w-fit items-center gap-1 text-sm text-muted transition hover:text-fg">
        <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        Story
      </Link>
      <h1 className="mb-6 font-serif text-2xl text-fg">Wer ist dran</h1>
      {list.length === 0 ? (
        <p className="text-sm text-muted">Gerade wartet keine Szene auf jemanden.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {list.map(({ character, scenes }) => (
            <li key={character.id} className="rounded-xl border border-line bg-surface p-4">
              <div className="mb-2 flex items-center gap-3">
                <CharacterAvatar name={character.name} avatarUrl={character.avatar_url} size={36} />
                <Link href={`/characters/${character.id}`} className="font-medium text-fg transition hover:text-accent">
                  {character.name}
                </Link>
                {character.owner_id === user.id && <span className="rounded-full bg-accent-strong/15 px-2 py-0.5 text-xs text-accent">du</span>}
                <span className="ml-auto text-xs text-muted">{scenes.length}</span>
              </div>
              <ul className="flex flex-col">
                {scenes.map((s) => (
                  <li key={s.id}>
                    <Link href={`/story/${s.id}?ziel=ende`} className="flex items-baseline justify-between gap-3 rounded-lg px-2 py-1.5 transition hover:bg-surface-2">
                      <span className="min-w-0 truncate text-sm text-fg">{s.title}</span>
                      {s.turn_set_at && <span className="shrink-0 text-xs text-muted">{/^\d/.test(timeAgoShort(s.turn_set_at)) ? "seit " : ""}{timeAgoShort(s.turn_set_at)}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
