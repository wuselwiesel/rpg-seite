import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CharacterAvatar } from "@/components/character-avatar";
import { WorldCover } from "@/components/world-cover";
import { EnterWorldButton } from "@/app/worlds/enter-world-button";
import { JoinWorldButton } from "@/app/worlds/join-world-button";
import {
  searchCharacters,
  searchPosts,
  searchScenes,
  searchWiki,
  type CharacterHit,
  type PostHit,
  type SceneHit,
  type WikiHit,
} from "@/lib/global-search";
import type { Friendship, Profile, World } from "@/lib/types";
import { AddFriendButton } from "./add-friend-button";
import { FollowWorldButton } from "./follow-world-button";

type WorldWithCreator = World & { creator: Pick<Profile, "username" | "nickname"> | null };
type SearchTab = "all" | "characters" | "users" | "worlds" | "scenes" | "wiki" | "posts";
const TABS: { key: SearchTab; label: string; placeholder: string }[] = [
  { key: "all", label: "Alles", placeholder: "Charaktere, Szenen, Wiki, Beiträge durchsuchen..." },
  { key: "characters", label: "Charaktere", placeholder: "Name oder @nutzername..." },
  { key: "users", label: "Nutzer:innen", placeholder: "Benutzername..." },
  { key: "worlds", label: "Welten", placeholder: "Weltname..." },
  { key: "scenes", label: "Szenen", placeholder: "Titel, Text oder Ort..." },
  { key: "wiki", label: "Wiki", placeholder: "Titel oder Text..." },
  { key: "posts", label: "Beiträge", placeholder: "Titel, Text oder #Tag..." },
];
const WIKI_CATEGORY_LABELS: Record<string, string> = { ort: "Ort", npc: "NPC", fraktion: "Fraktion", sonstiges: "Sonstiges" };

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const tab: SearchTab = TABS.some((t) => t.key === params.tab) ? (params.tab as SearchTab) : "all";
  const isWelcome = params.welcome === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  let characterResults: CharacterHit[] = [];
  let userResults: Profile[] = [];
  const friendStatus = new Map<string, { status: "accepted" | "pending"; direction: "incoming" | "outgoing" }>();

  let worldResults: WorldWithCreator[] = [];
  const memberWorldIds = new Set<string>();
  const followedWorldIds = new Set<string>();

  let sceneResults: SceneHit[] = [];
  let wikiResults: WikiHit[] = [];
  let postResults: PostHit[] = [];

  if (tab === "all") {
    if (q) {
      [characterResults, sceneResults, wikiResults, postResults] = await Promise.all([
        searchCharacters(supabase, q, 5),
        searchScenes(supabase, q, 5),
        searchWiki(supabase, q, 5),
        searchPosts(supabase, q, 5),
      ]);
    }
  } else if (tab === "posts") {
    if (q) postResults = await searchPosts(supabase, q, 30);
  } else if (tab === "characters") {

    if (q) characterResults = await searchCharacters(supabase, q, 30);
  } else if (tab === "users") {
    const [{ data: friendships }, { data: profiles }] = await Promise.all([
      supabase
        .from("friendships")
        .select("*")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .returns<Friendship[]>(),
      q
        ? supabase
            .from("profiles")
            .select("*")
            .or(`username.ilike.%${q}%,nickname.ilike.%${q}%`)
            .neq("id", user.id)
            .order("username")
            .limit(20)
            .returns<Profile[]>()
        : Promise.resolve({ data: [] as Profile[] }),
    ]);

    for (const f of friendships ?? []) {
      const otherId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
      const direction = f.requester_id === user.id ? "outgoing" : "incoming";
      friendStatus.set(otherId, { status: f.status, direction });
    }
    userResults = profiles ?? [];
  } else if (tab === "scenes") {
    if (q) sceneResults = await searchScenes(supabase, q, 30);
  } else if (tab === "wiki") {
    if (q) wikiResults = await searchWiki(supabase, q, 30);
  } else {
    const [{ data: memberships }, { data: follows }, { data: worlds }] = await Promise.all([
      supabase.from("world_members").select("world_id").eq("user_id", user.id),
      supabase.from("world_follows").select("world_id").eq("user_id", user.id),
      q
        ? supabase
            .from("worlds")
            .select("*, creator:created_by(username, nickname)")
            .ilike("name", `%${q}%`)
            .order("name")
            .limit(20)
            .returns<WorldWithCreator[]>()
        : Promise.resolve({ data: [] as WorldWithCreator[] }),
    ]);

    for (const m of memberships ?? []) memberWorldIds.add(m.world_id);
    for (const f of follows ?? []) followedWorldIds.add(f.world_id);
    worldResults = worlds ?? [];
  }

  // Beliebte Hashtags der letzten Beiträge (nur ohne Suchbegriff).
  let trendingTags: [string, number][] = [];
  if (!q) {
    const { data: recent } = await supabase
      .from("posts")
      .select("tags")
      .lte("publish_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(300);
    const counts = new Map<string, number>();
    for (const row of recent ?? []) for (const tag of (row.tags as string[] | null) ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    trendingTags = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 12);
  }

  const tabHref = (t: SearchTab) => `/search?tab=${t}&q=${encodeURIComponent(q)}`;

  return (
    <div className="mx-auto max-w-2xl xl:max-w-3xl 2xl:max-w-4xl px-4 py-10">
      <h1 className="mb-1 font-serif text-3xl text-fg">Suche</h1>
      <p className="mb-6 text-sm text-muted">
        {isWelcome
          ? "Tritt einer bestehenden Welt bei, um direkt mit einem Charakter loszulegen."
          : "Durchsuche Charaktere, Szenen, Wiki und Beiträge auf einmal, finde Freund:innen über ihren Benutzernamen oder entdecke neue Welten."}
      </p>
      {isWelcome && (
        <p className="mb-6 text-sm text-muted">
          Lieber eine eigene Welt erschaffen?{" "}
          <Link href="/worlds/new?welcome=1" className="text-accent hover:underline">
            Welt erschaffen
          </Link>
        </p>
      )}

      {trendingTags.length > 0 && (
        <div className="mb-5">
          <p className="mb-2 text-sm font-medium text-fg">Beliebte Hashtags</p>
          <div className="flex flex-wrap gap-2">
            {trendingTags.map(([tag, count]) => (
              <Link
                key={tag}
                href={`/?tag=${encodeURIComponent(tag)}`}
                className="rounded-full bg-surface-2 px-3 py-1 text-xs font-medium text-fg-soft transition hover:text-accent"
              >
                #{tag} <span className="text-muted">{count}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg bg-surface-2 p-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/search?tab=${t.key}${q ? `&q=${encodeURIComponent(q)}` : ""}${isWelcome ? "&welcome=1" : ""}`}
            className={`shrink-0 rounded-md px-3 py-1.5 text-center text-sm font-medium transition ${
              tab === t.key ? "bg-surface text-fg" : "text-muted hover:text-fg-soft"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <form action="/search" className="mb-8 flex gap-2">
        <input type="hidden" name="tab" value={tab} />
        {isWelcome && <input type="hidden" name="welcome" value="1" />}
        <input
          type="text"
          name="q"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          defaultValue={q}
          placeholder={TABS.find((t) => t.key === tab)?.placeholder}
          className="flex-1 rounded-md border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent"
        />
        <button
          type="submit"
          className="rounded-md bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90"
        >
          Suchen
        </button>
      </form>

      {!q && <p className="text-sm text-muted">Gib einen Suchbegriff ein.</p>}

      {q && tab === "users" && (
        <ul className="flex flex-col gap-2">
          {userResults.length === 0 && (
            <p className="text-sm text-muted">Niemand mit diesem Namen gefunden.</p>
          )}
          {userResults.map((p) => {
            const status = friendStatus.get(p.id);
            return (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <CharacterAvatar name={p.nickname || p.username} avatarUrl={p.avatar_url} size={40} />
                  <div>
                    <p className="text-sm font-medium text-fg">{p.nickname || p.username}</p>
                    <p className="text-xs text-muted">@{p.username}</p>
                  </div>
                </div>
                {status?.status === "accepted" ? (
                  <span className="shrink-0 text-xs text-muted">Befreundet</span>
                ) : status?.status === "pending" && status.direction === "outgoing" ? (
                  <span className="shrink-0 text-xs text-muted">Angefragt</span>
                ) : status?.status === "pending" && status.direction === "incoming" ? (
                  <Link href="/friends" className="shrink-0 text-xs text-accent hover:underline">
                    Anfrage offen
                  </Link>
                ) : (
                  <AddFriendButton username={p.username} />
                )}
              </li>
            );
          })}
        </ul>
      )}

      {q && tab === "worlds" && (
        <ul className="flex flex-col gap-2">
          {worldResults.length === 0 && (
            <p className="text-sm text-muted">Keine Welt mit diesem Namen gefunden.</p>
          )}
          {worldResults.map((w) => (
            <li
              key={w.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3"
            >
              <Link href={`/worlds/${w.id}`} className="flex flex-1 items-center gap-3">
                <WorldCover name={w.name} coverUrl={w.cover_image_url} className="h-12 w-12 shrink-0 text-base" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fg hover:text-accent">{w.name}</p>
                  <p className="truncate text-xs text-muted">
                    {w.description || `von @${w.creator?.nickname || w.creator?.username}`}
                  </p>
                </div>
              </Link>
              {memberWorldIds.has(w.id) ? (
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted">Mitglied</span>
                  <EnterWorldButton worldId={w.id} />
                </div>
              ) : (
                <div className="flex shrink-0 items-center gap-2">
                  <FollowWorldButton worldId={w.id} initialFollowing={followedWorldIds.has(w.id)} />
                  <JoinWorldButton worldId={w.id} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {q && (tab === "characters" || tab === "all") && (
        <ResultSection title={tab === "all" ? "Charaktere" : undefined} moreHref={tab === "all" && characterResults.length >= 5 ? tabHref("characters") : undefined} empty={tab !== "all" ? "Kein Charakter gefunden." : undefined} count={characterResults.length}>
          {characterResults.map((c) => (
            <li key={c.id}>
              <Link
                href={`/characters/${c.id}`}
                className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 transition hover:bg-surface-2"
              >
                <CharacterAvatar name={c.name} avatarUrl={c.avatar_url} size={44} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-fg">{c.username ?? c.name}</p>
                  <p className="truncate text-xs text-muted">
                    {c.username ? `${c.name} · ` : ""}
                    {c.world}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ResultSection>
      )}

      {q && (tab === "scenes" || tab === "all") && (
        <ResultSection title={tab === "all" ? "Story-Szenen" : undefined} moreHref={tab === "all" && sceneResults.length >= 5 ? tabHref("scenes") : undefined} empty={tab !== "all" ? "Keine Szene gefunden." : undefined} count={sceneResults.length}>
          {sceneResults.map((sc) => (
            <li key={sc.id}>
              <Link
                href={`/story/${sc.id}`}
                className="flex flex-col gap-1 rounded-lg border border-line bg-surface px-4 py-3 transition hover:bg-surface-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-fg">{sc.title}</p>
                  {sc.location && <span className="shrink-0 text-xs text-muted">{sc.location}</span>}
                </div>
                <p className="truncate text-xs text-muted">
                  {sc.character} · {sc.world}
                </p>
                <p className="line-clamp-2 text-xs text-fg-soft">{sc.snippet}</p>
              </Link>
            </li>
          ))}
        </ResultSection>
      )}

      {q && (tab === "wiki" || tab === "all") && (
        <ResultSection title={tab === "all" ? "Wiki" : undefined} moreHref={tab === "all" && wikiResults.length >= 5 ? tabHref("wiki") : undefined} empty={tab !== "all" ? "Kein Wiki-Eintrag gefunden." : undefined} count={wikiResults.length}>
          {wikiResults.map((w) => (
            <li key={w.id}>
              <Link
                href={`/wiki/${w.id}`}
                className="flex flex-col gap-1 rounded-lg border border-line bg-surface px-4 py-3 transition hover:bg-surface-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-fg">{w.title}</p>
                  <span className="shrink-0 text-xs text-muted">{WIKI_CATEGORY_LABELS[w.category] ?? w.category}</span>
                </div>
                <p className="truncate text-xs text-muted">{w.world}</p>
                {w.snippet && <p className="line-clamp-2 text-xs text-fg-soft">{w.snippet}</p>}
              </Link>
            </li>
          ))}
        </ResultSection>
      )}

      {q && (tab === "posts" || tab === "all") && (
        <ResultSection title={tab === "all" ? "Beiträge" : undefined} moreHref={tab === "all" && postResults.length >= 5 ? tabHref("posts") : undefined} empty={tab !== "all" ? "Kein Beitrag gefunden." : undefined} count={postResults.length}>
          {postResults.map((po) => (
            <li key={po.id}>
              <Link
                href={`/posts/${po.id}`}
                className="flex flex-col gap-1 rounded-lg border border-line bg-surface px-4 py-3 transition hover:bg-surface-2"
              >
                <p className="truncate text-sm font-semibold text-fg">{po.title}</p>
                <p className="truncate text-xs text-muted">
                  {po.character} · {po.world}
                </p>
                {po.snippet && <p className="line-clamp-2 text-xs text-fg-soft">{po.snippet}</p>}
              </Link>
            </li>
          ))}
        </ResultSection>
      )}

      {q && tab === "all" && characterResults.length + sceneResults.length + wikiResults.length + postResults.length === 0 && (
        <p className="text-sm text-muted">Nichts gefunden. Probier einen anderen Begriff oder die Reiter für Nutzer:innen und Welten.</p>
      )}
    </div>
  );
}

// Ergebnisliste mit optionaler Überschrift ("Alles"-Reiter) und Link zum vollständigen Reiter.
function ResultSection({
  title,
  moreHref,
  empty,
  count,
  children,
}: {
  title?: string;
  moreHref?: string;
  empty?: string;
  count: number;
  children: React.ReactNode;
}) {
  if (count === 0 && !empty) return null;
  return (
    <section className="mb-6">
      {title && (
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="font-serif text-lg text-fg">{title}</h2>
          {moreHref && (
            <Link href={moreHref} className="text-xs text-accent hover:underline">
              Alle anzeigen
            </Link>
          )}
        </div>
      )}
      {count === 0 ? <p className="text-sm text-muted">{empty}</p> : <ul className="flex flex-col gap-2">{children}</ul>}
    </section>
  );
}
