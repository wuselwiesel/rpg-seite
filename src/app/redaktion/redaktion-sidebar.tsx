import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAccountChats } from "@/lib/account-chat";
import { CharacterAvatar } from "@/components/character-avatar";
import type { Profile } from "@/lib/types";

// Rechte Spalte wie beim Ingame-Feed: eigenes Redaktions-Profil und die letzten Chats.
export async function RedaktionSidebar({ userId }: { userId: string }) {
  const supabase = await createClient();
  const [{ data: profile }, chats] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle<Profile>(),
    getAccountChats(userId),
  ]);
  const name = profile?.nickname || profile?.username || "Du";

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-3 px-1 font-serif text-lg text-fg">Profil</h2>
        <Link
          href={`/redaktion/profil/${userId}`}
          className="flex items-center gap-3 rounded-xl px-1 py-1 transition hover:bg-surface-2"
        >
          <CharacterAvatar name={name} avatarUrl={profile?.avatar_url} size={44} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-fg">{name}</p>
            {profile?.username && <p className="truncate text-xs text-muted">@{profile.username}</p>}
          </div>
        </Link>
      </section>
      <section>
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="font-serif text-lg text-fg">Deine Chats</h2>
          <Link href="/redaktion/chat" className="text-sm text-accent hover:underline">
            Alle
          </Link>
        </div>
        <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-2">
          {chats.length ? (
            chats.slice(0, 6).map((c) => {
              return (
                <Link
                  key={c.id}
                  href={`/redaktion/chat/${c.id}`}
                  className="flex items-center gap-2 rounded-xl px-1.5 py-1.5 transition hover:bg-surface-2"
                >
                  <CharacterAvatar name={c.title} avatarUrl={c.avatarUrl} size={32} />
                  <span className="min-w-0 flex-1 truncate text-sm text-fg-soft">{c.title}</span>
                  {c.unread > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-strong px-1.5 text-[11px] font-semibold text-on-accent-strong">
                      {c.unread}
                    </span>
                  )}
                </Link>
              );
            })
          ) : (
            <p className="px-2 py-1 text-sm text-muted">Noch keine Chats.</p>
          )}
        </div>
      </section>
    </div>
  );
}
