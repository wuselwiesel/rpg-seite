import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { AccountChatRoom, type AccountMessage } from "./account-chat-room";

export default async function AccountChatPage({ params }: PageProps<"/redaktion/chat/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: participants }, { data: messages }] = await Promise.all([
    supabase
      .from("account_chat_participants")
      .select("user_id, last_read_at, muted, profiles(*)")
      .eq("chat_id", id)
      .returns<{ user_id: string; last_read_at: string; muted: boolean; profiles: Profile | null }[]>(),
    supabase
      .from("account_messages")
      .select("id, sender_id, content, created_at, updated_at")
      .eq("chat_id", id)
      .order("created_at", { ascending: true })
      .returns<AccountMessage[]>(),
  ]);
  const me = participants?.find((p) => p.user_id === user.id);
  if (!me) notFound();
  const partner = participants?.find((p) => p.user_id !== user.id);

  return (
    <AccountChatRoom
      chatId={id}
      userId={user.id}
      partnerName={partner?.profiles?.nickname || partner?.profiles?.username || "Unbekannt"}
      partnerAvatarUrl={partner?.profiles?.avatar_url ?? null}
      partnerProfileId={partner?.user_id ?? null}
      partnerLastRead={partner?.last_read_at ?? null}
      initialMessages={messages ?? []}
      initialMuted={me.muted}
    />
  );
}
