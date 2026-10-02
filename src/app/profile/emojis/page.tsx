import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { SettingsHeader } from "@/components/settings-back";
import { EmojiManager } from "./emoji-manager";

export default async function EmojiSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const world = await getActiveWorld(user.id);
  if (!world) {
    return (
      <>
        <SettingsHeader title="Eigene Emojis" />
        <p className="text-sm text-muted">
          Emojis gehören zu einer Welt.{" "}
          <Link href="/worlds" className="text-accent hover:underline">
            Wähle zuerst eine Welt.
          </Link>
        </p>
      </>
    );
  }

  const { data } = await supabase
    .from("custom_emojis")
    .select("id, name, image_url, created_by")
    .eq("world_id", world.id)
    .order("name");

  return (
    <>
      <SettingsHeader
        title="Eigene Emojis"
        subtitle="Lade Bilder hoch und nutze sie überall als :name: – in Beiträgen, Kommentaren, Chats, Story und Wiki. Alle Mitglieder der Welt können sie benutzen."
      />
      <EmojiManager
        worldName={world.name}
        emojis={data ?? []}
        currentUserId={user.id}
        isWorldOwner={world.created_by === user.id}
      />
    </>
  );
}
