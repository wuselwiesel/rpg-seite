import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutForm } from "@/components/logout-form";
import type { Profile } from "@/lib/types";
import { ProfileForm } from "./profile-form";
import { PushSubscribeToggle } from "@/components/push-subscribe-toggle";
import { PaletteSwitcher } from "@/components/palette-switcher";
import { AppLogoPicker } from "@/components/app-logo-picker";
import { NotificationSettings } from "./notification-settings";
import { DEFAULT_PREFS } from "@/lib/notification-prefs";

export default async function ProfilePage({ searchParams }: PageProps<"/profile">) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

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
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-1 font-serif text-3xl text-fg">Einstellungen</h1>
      <p className="mb-6 text-sm text-muted">Dein Konto und die App.</p>

      {params.saved === "1" && (
        <p className="mb-4 rounded-md bg-surface-2 px-3 py-2 text-sm text-fg-soft">
          Gespeichert.
        </p>
      )}

      <h2 className="mb-3 font-serif text-lg text-fg">Konto</h2>
      <ProfileForm profile={profile!} />

      <div className="mt-8 border-t border-line pt-6">
        <h2 className="mb-3 font-serif text-lg text-fg">Farbpalette</h2>
        <PaletteSwitcher />
      </div>

      <div className="mt-8 border-t border-line pt-6">
        <h2 className="mb-3 font-serif text-lg text-fg">App-Logo</h2>
        <AppLogoPicker />
      </div>

      <div className="mt-8 border-t border-line pt-6">
        <h2 className="mb-3 font-serif text-lg text-fg">Charaktere</h2>
        <Link href="/characters" className="text-sm text-fg-soft transition hover:text-accent">
          Charaktere verwalten
        </Link>
      </div>

      <div className="mt-8 border-t border-line pt-6">
        <PushSubscribeToggle />
      </div>

      <div className="mt-8 border-t border-line pt-6">
        <h2 className="mb-3 font-serif text-lg text-fg">Benachrichtigungen feiner einstellen</h2>
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

      <div className="mt-8 border-t border-line pt-6">
        <LogoutForm />
      </div>
    </div>
  );
}
