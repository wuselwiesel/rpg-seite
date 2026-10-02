import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { stripHtml } from "@/lib/strip-html";
import type { Profile, RedaktionProfile } from "@/lib/types";
import { EditRedaktionProfileForm } from "./edit-form";

export default async function EditRedaktionProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: redProfile }, { data: posts }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>(),
    supabase.from("redaktion_profiles").select("*").eq("user_id", user.id).maybeSingle<RedaktionProfile>(),
    supabase
      .from("redaktion_posts")
      .select("id, content, media_type, created_at")
      .eq("author_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  if (!profile) redirect("/redaktion");

  const choices = (posts ?? []).map((p) => ({
    id: p.id as string,
    label:
      stripHtml(String(p.content ?? "")).slice(0, 70) ||
      (p.media_type === "video" ? "Video" : p.media_type === "image" ? "Foto" : "Umfrage"),
  }));

  return (
    <div className="mx-auto max-w-2xl xl:max-w-3xl 2xl:max-w-4xl px-4 py-6 sm:py-10">
      <Link
        href={`/redaktion/profil/${user.id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted transition hover:text-fg"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        Zurück zum Profil
      </Link>
      <h1 className="mb-1 font-serif text-3xl text-fg">Redaktions-Profil bearbeiten</h1>
      <p className="mb-6 text-sm text-muted">
        Gestalte dein Profil für die Redaktion. Profilbild und Name änderst du in den{" "}
        <Link href="/profile" className="text-accent hover:underline">
          Einstellungen
        </Link>
        .
      </p>
      <EditRedaktionProfileForm
        name={profile.nickname || profile.username}
        avatarUrl={profile.avatar_url}
        initial={redProfile}
        postChoices={choices}
      />
    </div>
  );
}
