import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, Clover, Dices } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { CharacterAvatar } from "@/components/character-avatar";
import { formatDateTime } from "@/lib/format";
import { RollRow } from "./roll-row";

const PAGE_SIZE = 40;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

type RollRow = {
  id: string;
  story_post_id: string;
  created_at: string;
  roll_label: string;
  roll_stat_name: string | null;
  roll_value: number | null;
  roll_bonus: number | null;
  roll_die: number | null;
  roll_result: number | null;
  roll_success: boolean | null;
  roll_luck_remaining: number | null;
  roll_condition: string | null;
  characters: { id: string; name: string; avatar_url: string | null; owner_id: string } | null;
  roll_target_character: { name: string } | null;
  story_posts: { title: string; world_id: string } | null;
};

// Schmale Beschreibung des Abfrage-Bauers; die volle Typ-Auswertung der Verknüpfungen ist hier zu tief.
type RollQuery = {
  eq(column: string, value: unknown): RollQuery;
  not(column: string, operator: string, value: unknown): RollQuery;
  order(column: string, options: { ascending: boolean }): RollQuery;
  range(from: number, to: number): PromiseLike<{ data: RollRow[] | null; count: number | null }>;
};

function href(page: number, who: string, result: string) {
  const q = new URLSearchParams();
  if (page > 1) q.set("seite", String(page));
  if (who) q.set("charakter", who);
  if (result) q.set("ergebnis", result);
  const s = q.toString();
  return `/story/wuerfe${s ? `?${s}` : ""}`;
}

export default async function RollHistoryPage({ searchParams }: PageProps<"/story/wuerfe">) {
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(first(sp.seite), 10) || 1);
  const who = first(sp.charakter).slice(0, 40);
  const result = first(sp.ergebnis) === "erfolg" ? "erfolg" : first(sp.ergebnis) === "misserfolg" ? "misserfolg" : "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const world = await getActiveWorld(user.id);
  if (!world) redirect("/worlds");

  // Spaltenliste als einfacher String, sonst wird die Typ-Auswertung der Verknüpfungen zu tief
  const columns: string =
    "id, story_post_id, created_at, roll_label, roll_stat_name, roll_value, roll_bonus, roll_die, roll_result, roll_success, roll_luck_remaining, roll_condition, characters!story_entries_character_id_fkey(id, name, avatar_url, owner_id), roll_target_character:roll_target_character_id(name), story_posts!inner(title, world_id)";
  const base = supabase
    .from("story_entries")
    .select(columns, { count: "exact" })
    .eq("story_posts.world_id", world.id)
    .not("roll_label", "is", null) as unknown as RollQuery;
  let filtered = base;
  if (who) filtered = filtered.eq("character_id", who);
  if (result) filtered = filtered.not("roll_value", "is", null).eq("roll_success", result === "erfolg");
  const query = filtered.order("created_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const [{ data, count }, { data: characters }] = await Promise.all([
    query,
    supabase.from("characters").select("id, name").eq("world_id", world.id).order("name"),
  ]);
  const rolls = data ?? [];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const field = "rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 xl:max-w-3xl 2xl:max-w-4xl">
      <div className="mb-5 flex items-center gap-3">
        <Link href="/story" aria-label="Zurück zur Story" className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg">
          <ChevronLeft className="h-5 w-5" strokeWidth={2} />
        </Link>
        <Dices className="h-6 w-6 text-accent" strokeWidth={1.75} />
        <h1 className="font-serif text-3xl text-fg">Würfelverlauf</h1>
      </div>

      <form method="get" action="/story/wuerfe" className="mb-5 flex flex-wrap items-center gap-2">
        <select name="charakter" defaultValue={who} aria-label="Charakter" className={field}>
          <option value="">Alle Charaktere</option>
          {(characters ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="ergebnis" defaultValue={result} aria-label="Ergebnis" className={field}>
          <option value="">Alle Ergebnisse</option>
          <option value="erfolg">Erfolge</option>
          <option value="misserfolg">Misserfolge</option>
        </select>
        <button type="submit" className="rounded-lg bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90">
          Filtern
        </button>
        {(who || result) && (
          <Link href="/story/wuerfe" className="px-1 text-sm text-muted hover:text-fg">
            Zurücksetzen
          </Link>
        )}
      </form>

      {rolls.length === 0 ? (
        <p className="text-muted">Noch keine Würfe.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rolls.map((r) => (
            <RollRow key={r.id} entryId={r.id} storyPostId={r.story_post_id} mine={r.characters?.owner_id === user.id}>
                <CharacterAvatar name={r.characters?.name ?? "?"} avatarUrl={r.characters?.avatar_url} size={40} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <span className="font-medium text-fg">{r.characters?.name ?? "Unbekannt"}</span>
                    <span className="text-fg-soft">
                      würfelt auf <span className="font-medium text-fg">„{r.roll_label}“</span>
                      {r.roll_stat_name && <span className="text-muted"> ({r.roll_stat_name})</span>}
                      {r.roll_condition && <span className="text-muted"> · {r.roll_condition}</span>}
                      {r.roll_target_character?.name && (
                        <>
                          {" "}
                          gegen <span className="font-medium text-fg">{r.roll_target_character.name}</span>
                        </>
                      )}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <span className="font-serif text-xl text-fg">
                      {r.roll_value != null ? `${r.roll_result}/${r.roll_value + (r.roll_bonus ?? 0)}` : r.roll_result}
                    </span>
                    <span className="text-muted">
                      W{r.roll_die}
                      {r.roll_value != null && r.roll_bonus ? ` (${r.roll_value}${r.roll_bonus > 0 ? "+" : ""}${r.roll_bonus})` : ""}
                    </span>
                    {r.roll_value != null && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          r.roll_success ? "bg-green-500/15 text-green-700 dark:text-green-400" : "bg-red-500/15 text-red-700 dark:text-red-400"
                        }`}
                      >
                        {r.roll_success ? "Erfolg" : "Misserfolg"}
                      </span>
                    )}
                    {r.roll_luck_remaining != null && (
                      <span className="inline-flex items-center gap-0.5" title={`${r.roll_luck_remaining} Glückspunkt${r.roll_luck_remaining === 1 ? "" : "e"} übrig`}>
                        {Array.from({ length: r.roll_luck_remaining }, (_, i) => (
                          <Clover key={i} className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
                        ))}
                        {r.roll_luck_remaining === 0 && <span className="text-xs text-muted">0 Glück</span>}
                      </span>
                    )}
                  </span>
                  <span className="break-words text-xs text-muted">
                    {r.story_posts?.title} · {formatDateTime(r.created_at)}
                  </span>
                </span>
            </RollRow>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between gap-3">
          {page > 1 ? (
            <Link href={href(page - 1, who, result)} className="flex items-center gap-1 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm text-fg-soft transition hover:bg-surface-2 hover:text-fg">
              <ChevronLeft className="h-4 w-4" strokeWidth={2} />
              Zurück
            </Link>
          ) : (
            <span />
          )}
          <p className="text-sm text-muted">
            Seite {page} von {totalPages}
          </p>
          {page < totalPages ? (
            <Link href={href(page + 1, who, result)} className="flex items-center gap-1 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm text-fg-soft transition hover:bg-surface-2 hover:text-fg">
              Weiter
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}
