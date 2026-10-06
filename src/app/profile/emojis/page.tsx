import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsHeader } from "@/components/settings-back";
import { EmojiManager } from "./emoji-manager";

export default async function EmojiSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("custom_emojis")
    .select("id, name, image_url, created_by")
    .order("name");

  return (
    <>
      <SettingsHeader
        title="Eigene Emojis"
        subtitle="Lade Bilder hoch und nutze sie überall als :name: – in allen Welten, in Beiträgen, Kommentaren, Chats, Story und Wiki. Alle können sie benutzen."
      />
      <EmojiManager
        emojis={data ?? []}
        currentUserId={user.id}
      />
    </>
  );
}
