import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Startet (oder öffnet) den Chat mit einer befreundeten Person und leitet dorthin weiter.
export default async function StartAccountChatPage({ params }: PageProps<"/redaktion/chat/mit/[userId]">) {
  const { userId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: chatId, error } = await supabase.rpc("start_account_chat", { p_other: userId });
  if (error || !chatId) notFound();
  redirect(`/redaktion/chat/${chatId}`);
}
