import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CharacterAvatar } from "@/components/character-avatar";
import { WorldCover } from "@/components/world-cover";
import { EnterWorldButton } from "@/app/worlds/enter-world-button";
import type { Friendship, Profile, World } from "@/lib/types";
import { AddFriendButton } from "./add-friend-button";
import { FollowWorldButton } from "./follow-world-button";

type WorldWithCreator = World & { creator: Pick<Profile, "username" | "nickname"> | null };

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const tab = params.tab === "worlds" ? "worlds" : "users";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  let userResults: Profile[] = [];
  const friendStatus = new Map<string, { status: "accepted" | "pending"; direction: "incoming" | "outgoing" }>();

  let worldResults: WorldWithCreator[] = [];
  const memberWorldIds = new Set<string>();
  const followedWorldIds = new Set<string>();

  if (tab === "users") {
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-1 font-serif text-3xl text-fg">Suche</h1>
      <p className="mb-6 text-sm text-muted">
        Finde Freund:innen über ihren Benutzernamen oder entdecke neue Welten zum Folgen.
      </p>

      <div className="mb-4 flex gap-1 rounded-lg bg-surface-2 p-1">
        <Link
          href={`/search?tab=users${q ? `&q=${encodeURIComponent(q)}` : ""}`}
          className={`flex-1 rounded-md px-3 py-1.5 text-center text-sm font-medium transition ${
            tab === "users" ? "bg-surface text-fg" : "text-muted hover:text-fg-soft"
          }`}
        >
          Nutzer:innen
        </Link>
        <Link
          href={`/search?tab=worlds${q ? `&q=${encodeURIComponent(q)}` : ""}`}
          className={`flex-1 rounded-md px-3 py-1.5 text-center text-sm font-medium transition ${
            tab === "worlds" ? "bg-surface text-fg" : "text-muted hover:text-fg-soft"
          }`}
        >
          Welten
        </Link>
      </div>

      <form action="/search" className="mb-8 flex gap-2">
        <input type="hidden" name="tab" value={tab} />
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder={tab === "users" ? "Benutzername..." : "Weltname..."}
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
                <FollowWorldButton worldId={w.id} initialFollowing={followedWorldIds.has(w.id)} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
