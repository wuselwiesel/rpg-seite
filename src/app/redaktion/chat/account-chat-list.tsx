import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAccountChats } from "@/lib/account-chat";
import { getAcceptedFriends } from "@/lib/friends";
import { CharacterAvatar } from "@/components/character-avatar";
import { UsersRound } from "lucide-react";
import { messagePreview } from "@/lib/chat-preview";
import { AccountChatListItem } from "./account-chat-list-item";

export async function AccountChatList() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [chats, friends] = await Promise.all([getAccountChats(user.id), getAcceptedFriends(user.id)]);
  const chatPartnerIds = new Set(chats.map((c) => c.partner?.id));
  const newFriends = friends.filter((f) => f && !chatPartnerIds.has(f.id));

  return (
    <div className="flex flex-col gap-1 px-2">
      <h1 className="px-3 pb-2 font-serif text-2xl text-fg">Redaktions-Chat</h1>
      {chats.length === 0 && (
        <p className="px-3 pb-3 text-sm text-muted">
          Noch keine Chats. Starte unten einen Chat mit einer befreundeten Person.
        </p>
      )}
      {chats.map((c) => {
        return (
          <AccountChatListItem
            key={c.id}
            id={c.id}
            title={c.title}
            kind={c.kind}
            avatarUrl={c.avatarUrl}
            partnerId={c.partner?.id}
            muted={c.muted}
            unread={c.unread}
            lastMessage={
              c.lastMessage
                ? { text: messagePreview(c.lastMessage), at: c.lastMessage.created_at, mine: c.lastMessage.sender_id === user.id }
                : null
            }
          />
        );
      })}
      <Link
        href="/redaktion/chat/gruppe/neu"
        className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-fg transition hover:bg-surface-2/60"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-fg-soft">
          <UsersRound className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </span>
        Neue Gruppe
      </Link>
      {newFriends.length > 0 && (
        <div className="mt-4 border-t border-line pt-3">
          <p className="mb-1 px-3 text-xs font-medium text-muted">Neuer Chat mit</p>
          {newFriends.map((f) => (
            <Link
              key={f.id}
              href={`/redaktion/chat/mit/${f.id}`}
              className="flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-surface-2/60"
            >
              <CharacterAvatar name={f.nickname || f.username} avatarUrl={f.avatar_url} size={36} />
              <span className="truncate text-sm font-medium text-fg">{f.nickname || f.username}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
