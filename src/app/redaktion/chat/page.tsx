import { redirect } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AccountChatList } from "./account-chat-list";

export default async function RedaktionChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <>
      <div className="mx-auto max-w-2xl xl:max-w-3xl 2xl:max-w-4xl px-1 py-6 lg:hidden">
        <AccountChatList />
      </div>
      <div className="hidden h-full min-h-dvh flex-col items-center justify-center gap-3 text-muted lg:flex">
        <MessageCircle className="h-10 w-10" strokeWidth={1.5} />
        <p className="text-sm">Wähle links einen Chat aus.</p>
      </div>
    </>
  );
}
