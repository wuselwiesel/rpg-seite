import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { SettingsHeader } from "@/components/settings-back";
import { EmojiManager } from "./emoji-manager";

export const metadata = { title: "Emojis" };

export default async function EmojiSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const world = await getActiveWorld(user.id);
  const { data } = await supabase
    .from("custom_emojis")
    .select("id, name, image_url, created_by, world_only, world_id")
    .order("name");
  // Emojis dieser Welt und die älteren, die überall gelten
  const emojis = (data ?? []).filter((e) => !e.world_only || e.world_id === world?.id);

  return (
    <>
      <SettingsHeader title="Eigene Emojis" subtitle={world ? `Neue Emojis gelten in ${world.name}.` : undefined} />
      <EmojiManager emojis={emojis} currentUserId={user.id} worldName={world?.name ?? null} />
    </>
  );
}
