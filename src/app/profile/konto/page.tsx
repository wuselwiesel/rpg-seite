import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsHeader } from "@/components/settings-back";
import type { Profile } from "@/lib/types";
import { ProfileForm } from "../profile-form";
import { PasswordForm } from "./password-form";
import { DeleteAccountSection } from "./delete-account-section";
import { WelcomePrefs } from "./welcome-prefs";

export const metadata = { title: "Konto" };

export default async function AccountSettingsPage({ searchParams }: PageProps<"/profile/konto">) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
  if (!profile) redirect("/login");

  const { data: blockerRows } = await supabase.rpc("account_deletion_blockers");
  const blockers = (blockerRows ?? []) as { world_id: string; name: string; member_count: number }[];

  return (
    <>
      <SettingsHeader title="Konto" subtitle="Profilbild, Benutzername und Spitzname." />
      {params.saved === "1" && (
        <p className="mb-4 rounded-md bg-surface-2 px-3 py-2 text-sm text-fg-soft">Gespeichert.</p>
      )}
      <ProfileForm profile={profile} />
      <section className="mt-10 border-t border-line pt-6">
        <h2 className="mb-3 font-serif text-xl text-fg">Sichtbarkeit</h2>
        <WelcomePrefs announceJoins={profile.announce_joins !== false} introPublic={profile.intro_public === true} />
      </section>
      <section className="mt-10 border-t border-line pt-6">
        <h2 className="mb-3 font-serif text-xl text-fg">Passwort</h2>
        <PasswordForm />
      </section>
      <section className="mt-10 border-t border-line pt-6">
        <h2 className="mb-1 font-serif text-xl text-fg">Meine Daten</h2>
        <p className="mb-3 text-sm text-muted">Alles, was zu deinem Konto gehört, als Datei.</p>
        <a
          href="/profile/export"
          download
          className="inline-flex rounded-md border border-line px-4 py-2 text-sm font-medium text-fg-soft transition hover:bg-surface-2 hover:text-fg"
        >
          Daten herunterladen
        </a>
      </section>
      <section className="mt-10 border-t border-line pt-6">
        <h2 className="mb-3 font-serif text-xl text-fg">Konto löschen</h2>
        <DeleteAccountSection username={profile.username} blockers={blockers} />
      </section>
    </>
  );
}
