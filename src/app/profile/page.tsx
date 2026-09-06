import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { ProfileForm } from "./profile-form";

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

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-1 font-serif text-3xl text-fg">Dein Profil</h1>
      <p className="mb-6 text-sm text-muted">
        So sehen dich andere in der Chronik.
      </p>

      {params.saved === "1" && (
        <p className="mb-4 rounded-md bg-surface-2 px-3 py-2 text-sm text-fg-soft">
          Gespeichert.
        </p>
      )}

      <ProfileForm profile={profile!} />
    </div>
  );
}
