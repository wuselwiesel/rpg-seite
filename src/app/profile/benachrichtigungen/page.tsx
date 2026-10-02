import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsHeader } from "@/components/settings-back";
import { PushSubscribeToggle } from "@/components/push-subscribe-toggle";
import { DEFAULT_PREFS } from "@/lib/notification-prefs";
import { NotificationSettings } from "../notification-settings";

export default async function NotificationSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: prefsRow }, { data: myCharacters }] = await Promise.all([
    supabase.from("notification_prefs").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("characters").select("id, name, world_id, worlds(name)").eq("owner_id", user.id).order("name"),
  ]);
  const worldMap = new Map<string, { id: string; name: string; characters: { id: string; name: string }[] }>();
  for (const c of (myCharacters ?? []) as unknown as { id: string; name: string; world_id: string; worlds: { name: string } | null }[]) {
    const w = worldMap.get(c.world_id) ?? { id: c.world_id, name: c.worlds?.name ?? "Welt", characters: [] };
    w.characters.push({ id: c.id, name: c.name });
    worldMap.set(c.world_id, w);
  }

  return (
    <>
      <SettingsHeader title="Benachrichtigungen" />
      <PushSubscribeToggle />
      <div className="mt-8 border-t border-line pt-6">
        <h3 className="mb-3 font-serif text-lg text-fg">Feiner einstellen</h3>
        <NotificationSettings
          initial={{
            dnd_enabled: prefsRow?.dnd_enabled ?? DEFAULT_PREFS.dnd_enabled,
            dnd_start: prefsRow?.dnd_start ?? DEFAULT_PREFS.dnd_start,
            dnd_end: prefsRow?.dnd_end ?? DEFAULT_PREFS.dnd_end,
            digest_enabled: prefsRow?.digest_enabled ?? false,
            digest_only: prefsRow?.digest_only ?? false,
            muted_world_ids: prefsRow?.muted_world_ids ?? [],
            muted_character_ids: prefsRow?.muted_character_ids ?? [],
            muted_notification_types: prefsRow?.muted_notification_types ?? [],
          }}
          worlds={Array.from(worldMap.values())}
        />
      </div>
    </>
  );
}
