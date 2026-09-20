import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CharacterAvatar } from "@/components/character-avatar";
import { WorldCover } from "@/components/world-cover";
import { EnterWorldButton } from "@/app/worlds/enter-world-button";
import { JoinWorldButton } from "@/app/worlds/join-world-button";
import { escapePostgrestValue } from "@/lib/postgrest";
import type { Character, Friendship, Profile, World } from "@/lib/types";
import { AddFriendButton } from "./add-friend-button";
import { FollowWorldButton } from "./follow-world-button";

type WorldWithCreator = World & { creator: Pick<Profile, "username" | "nickname"> | null };

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const tab = params.tab === "worlds" ? "worlds" : params.tab === "users" ? "users" : "characters";
  const isWelcome = params.welcome === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  let characterResults: (Character & { worlds: { name: string } | null })[] = [];
  let userResults: Profile[] = [];
  const friendStatus = new Map<string, { status: "accepted" | "pending"; direction: "incoming" | "outgoing" }>();

  let worldResults: WorldWithCreator[] = [];
  const memberWorldIds = new Set<string>();
  const followedWorldIds = new Set<string>();

  if (tab === "characters") {
    if (q) {
      const term = escapePostgrestValue(q.replace(/^@/, ""));
      const { data } = await supabase
        .from("characters")
        .select("*, worlds(name)")
        .or(`username.ilike.%${term}%,name.ilike.%${term}%`)
        .order("name")
        .limit(30)
        .returns<(Character & { worlds: { name: string } | null })[]>();
      characterResults = data ?? [];
    }
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-1 font-serif text-3xl text-fg">Suche</h1>
      <p className="mb-6 text-sm text-muted">
        {isWelcome
          ? "Tritt einer bestehenden Welt bei, um direkt mit einem Charakter loszulegen."
          : "Finde Charaktere über Namen oder @Nutzernamen, Freund:innen über ihren Benutzernamen oder entdecke neue Welten."}
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

      <div className="mb-4 flex gap-1 rounded-lg bg-surface-2 p-1">
        <Link
          href={`/search?tab=characters${q ? `&q=${encodeURIComponent(q)}` : ""}${isWelcome ? "&welcome=1" : ""}`}
          className={`flex-1 rounded-md px-3 py-1.5 text-center text-sm font-medium transition ${
            tab === "characters" ? "bg-surface text-fg" : "text-muted hover:text-fg-soft"
          }`}
        >
          Charaktere
        </Link>
        <Link
          href={`/search?tab=users${q ? `&q=${encodeURIComponent(q)}` : ""}${isWelcome ? "&welcome=1" : ""}`}
          className={`flex-1 rounded-md px-3 py-1.5 text-center text-sm font-medium transition ${
            tab === "users" ? "bg-surface text-fg" : "text-muted hover:text-fg-soft"
          }`}
        >
          Nutzer:innen
        </Link>
        <Link
          href={`/search?tab=worlds${q ? `&q=${encodeURIComponent(q)}` : ""}${isWelcome ? "&welcome=1" : ""}`}
          className={`flex-1 rounded-md px-3 py-1.5 text-center text-sm font-medium transition ${
            tab === "worlds" ? "bg-surface text-fg" : "text-muted hover:text-fg-soft"
          }`}
        >
          Welten
        </Link>
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
          placeholder={tab === "characters" ? "Name oder @nutzername..." : tab === "users" ? "Benutzername..." : "Weltname..."}
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

      {q && tab === "characters" && (
        <ul className="flex flex-col gap-2">
          {characterResults.length === 0 && <p className="text-sm text-muted">Kein Charakter gefunden.</p>}
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
                    {c.worlds?.name}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

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
    </div>
  );
}
