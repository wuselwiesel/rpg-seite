import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { EMPTY_CHAT_THEME, type ChatTheme } from "@/lib/chat-theme";
import { getAcceptedFriends } from "@/lib/friends";
import { AccountChatRoom, type AccountMessage } from "./account-chat-room";

export default async function AccountChatPage({ params }: PageProps<"/redaktion/chat/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: participants }, { data: messages }, { data: themeRow }, { data: chat }] = await Promise.all([
    supabase
      .from("account_chat_participants")
      .select("user_id, last_read_at, muted, profiles(*)")
      .eq("chat_id", id)
      .returns<{ user_id: string; last_read_at: string; muted: boolean; profiles: Profile | null }[]>(),
    supabase
      .from("account_messages")
      .select("id, sender_id, content, image_url, created_at, updated_at")
      .eq("chat_id", id)
      .order("created_at", { ascending: true })
      .returns<AccountMessage[]>(),
    supabase
      .from("chat_themes")
      .select("main, accent, bg")
      .eq("user_id", user.id)
      .eq("chat_kind", "account")
      .eq("chat_id", id)
      .maybeSingle<ChatTheme>(),
    supabase
      .from("account_chats")
      .select("kind, name, avatar_url, created_by, world_id, worlds(name, cover_image_url)")
      .eq("id", id)
      .maybeSingle<{
        kind: "direct" | "group" | "world";
        name: string | null;
        avatar_url: string | null;
        created_by: string;
        world_id: string | null;
        worlds: { name: string; cover_image_url: string | null } | null;
      }>(),
  ]);
  const me = participants?.find((p) => p.user_id === user.id);
  if (!me) notFound();
  const kind = chat?.kind ?? "direct";
  const partner = kind === "direct" ? participants?.find((p) => p.user_id !== user.id) : undefined;
  const members = (participants ?? []).map((p) => ({
    id: p.user_id,
    name: p.profiles?.nickname || p.profiles?.username || "Unbekannt",
    avatarUrl: p.profiles?.avatar_url ?? null,
  }));
  const isCreator = kind === "group" && chat?.created_by === user.id;
  const memberIds = new Set(members.map((m) => m.id));
  const addable = isCreator
    ? (await getAcceptedFriends(user.id))
        .filter((f) => f && !memberIds.has(f.id))
        .map((f) => ({ id: f.id, name: f.nickname || f.username, avatarUrl: f.avatar_url }))
    : [];
  const title =
    kind === "world"
      ? (chat?.worlds?.name ?? "Welt")
      : kind === "group"
        ? (chat?.name ?? "Gruppe")
        : partner?.profiles?.nickname || partner?.profiles?.username || "Unbekannt";
  const avatarUrl =
    kind === "world" ? (chat?.worlds?.cover_image_url ?? null) : kind === "group" ? (chat?.avatar_url ?? null) : (partner?.profiles?.avatar_url ?? null);

  return (
    <AccountChatRoom
      chatId={id}
      userId={user.id}
      kind={kind}
      title={title}
      avatarUrl={avatarUrl}
      members={members}
      isCreator={isCreator}
      addableFriends={addable}
      selfName={members.find((m) => m.id === user.id)?.name ?? ""}
      worldId={chat?.world_id ?? null}
      partnerProfileId={partner?.user_id ?? null}
      partnerLastRead={partner?.last_read_at ?? null}
      initialMessages={messages ?? []}
      initialMuted={me.muted}
      initialTheme={themeRow ?? EMPTY_CHAT_THEME}
    />
  );
}
