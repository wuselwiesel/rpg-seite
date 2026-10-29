import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsHeader } from "@/components/settings-back";
import { ChatBubbleToggle } from "@/components/chat-bubble-toggle";
import { BadgePrefs } from "@/components/badge-prefs";
import { SendKeyPref } from "@/components/send-key-pref";

// Wie sich die App verhält (nicht, wie sie aussieht): Chat-Blase, Senden mit Enter, Badges
export default async function PersonalizeSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <>
      <SettingsHeader title="Personalisieren" subtitle="Chat-Blase und Senden gelten für dieses Gerät." />
      <h3 className="mb-3 font-serif text-lg text-fg">Chat-Blase</h3>
      <ChatBubbleToggle />
      <div className="mt-8 border-t border-line pt-6">
        <h3 className="mb-3 font-serif text-lg text-fg">Senden mit Enter</h3>
        <SendKeyPref />
      </div>
      <div className="mt-8 border-t border-line pt-6">
        <h3 className="mb-3 font-serif text-lg text-fg">Badges</h3>
        <BadgePrefs />
      </div>
    </>
  );
}
