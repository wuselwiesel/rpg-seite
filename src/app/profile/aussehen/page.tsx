import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsHeader } from "@/components/settings-back";
import { PaletteSwitcher } from "@/components/palette-switcher";
import { AppLogoPicker } from "@/components/app-logo-picker";
import { ChatBubbleToggle } from "@/components/chat-bubble-toggle";
import { BadgePrefs } from "@/components/badge-prefs";

export default async function AppearanceSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <>
      <SettingsHeader title="Aussehen" subtitle="Gilt für dieses Gerät." />
      <h3 className="mb-3 font-serif text-lg text-fg">Farbpalette</h3>
      <PaletteSwitcher />
      <div className="mt-8 border-t border-line pt-6">
        <h3 className="mb-3 font-serif text-lg text-fg">App-Logo</h3>
        <AppLogoPicker />
      </div>
      <div className="mt-8 border-t border-line pt-6">
        <h3 className="mb-3 font-serif text-lg text-fg">Chat-Blase</h3>
        <ChatBubbleToggle />
      </div>
      <div className="mt-8 border-t border-line pt-6">
        <h3 className="mb-3 font-serif text-lg text-fg">Badges</h3>
        <BadgePrefs />
      </div>
    </>
  );
}
