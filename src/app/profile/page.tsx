import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/lib/actions/auth";
import type { Profile } from "@/lib/types";
import { ProfileForm } from "./profile-form";
import { PushSubscribeToggle } from "@/components/push-subscribe-toggle";
import { PaletteSwitcher } from "@/components/palette-switcher";

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
        So sehen dich andere im Wortwinkel.
      </p>

      {params.saved === "1" && (
        <p className="mb-4 rounded-md bg-surface-2 px-3 py-2 text-sm text-fg-soft">
          Gespeichert.
        </p>
      )}

      <ProfileForm profile={profile!} />

      <div className="mt-8 border-t border-line pt-6">
        <h2 className="mb-3 font-serif text-lg text-fg">Farbpalette</h2>
        <PaletteSwitcher />
      </div>

      <div className="mt-8 border-t border-line pt-6">
        <Link href="/characters" className="text-sm text-fg-soft transition hover:text-accent">
          Charaktere verwalten
        </Link>
      </div>

      <div className="mt-8 border-t border-line pt-6">
        <PushSubscribeToggle />
      </div>

      <div className="mt-8 border-t border-line pt-6">
        <form action={logout}>
          <button
            type="submit"
            className="text-sm text-muted transition hover:text-red-600 dark:hover:text-red-400"
          >
            Abmelden
          </button>
        </form>
      </div>
    </div>
  );
}
