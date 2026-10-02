import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsHeader } from "@/components/settings-back";
import type { Profile } from "@/lib/types";
import { ProfileForm } from "../profile-form";

export default async function AccountSettingsPage({ searchParams }: PageProps<"/profile/konto">) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
  if (!profile) redirect("/login");

  return (
    <>
      <SettingsHeader title="Konto" subtitle="Profilbild, Benutzername und Spitzname." />
      {params.saved === "1" && (
        <p className="mb-4 rounded-md bg-surface-2 px-3 py-2 text-sm text-fg-soft">Gespeichert.</p>
      )}
      <ProfileForm profile={profile} />
    </>
  );
}
