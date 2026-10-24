import Link from "next/link";
import { redirect } from "next/navigation";
import { Award, BarChart3, ChevronRight, Globe2, History, NotebookPen, UserPlus, UserRound, Users, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isAppAdmin } from "@/lib/account-marks";
import { getAltAccountLabel } from "@/lib/account-switch";
import { CharacterAvatar } from "@/components/character-avatar";
import { SettingsList } from "@/components/settings-sheet";

export const metadata = { title: "Du" };

const LINK = "flex items-center gap-3 border-b border-line px-4 py-3 text-[15px] font-medium text-fg transition last:border-0 hover:bg-surface-2";

function Entry({ href, icon: Icon, children }: { href: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <Link href={href} className={LINK}>
      <Icon className="h-[18px] w-[18px] shrink-0 text-accent" strokeWidth={2} />
      <span className="flex-1">{children}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} />
    </Link>
  );
}

// Redaktion › Du: alles rund um dich als Person (außerhalb des Spiels) und die Einstellungen
export default async function RedaktionYouPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, appAdmin, altAccount] = await Promise.all([
    supabase.from("profiles").select("username, nickname, avatar_url").eq("id", user.id).maybeSingle<{ username: string; nickname: string | null; avatar_url: string | null }>(),
    isAppAdmin(),
    getAltAccountLabel(),
  ]);
  const name = profile?.nickname || profile?.username || "";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-6 sm:py-10 xl:max-w-3xl">
      <Link href={`/redaktion/profil/${user.id}`} className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_2px_rgba(28,37,64,.06)] transition hover:bg-surface-2">
        <CharacterAvatar name={name} avatarUrl={profile?.avatar_url} size={60} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-serif text-2xl text-fg">{name}</span>
          {profile?.username && <span className="block text-sm text-muted">@{profile.username}</span>}
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted" strokeWidth={2} />
      </Link>

      <nav className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(28,37,64,.06)]">
        <Entry href={`/redaktion/profil/${user.id}`} icon={UserRound}>
          Spielerprofil
        </Entry>
        <Entry href="/characters" icon={Users}>
          Meine Charaktere
        </Entry>
        <Entry href="/worlds" icon={Globe2}>
          Meine Welten
        </Entry>
        <Entry href="/friends" icon={UserPlus}>
          Freund:innen
        </Entry>
        <Entry href="/badges" icon={Award}>
          Badges
        </Entry>
        <Entry href="/redaktion/verlauf" icon={History}>
          Änderungsverlauf
        </Entry>
        <Entry href="/notizen" icon={NotebookPen}>
          Notizbuch
        </Entry>
        {appAdmin && (
          <Entry href="/redaktion/ueberblick" icon={BarChart3}>
            Überblick
          </Entry>
        )}
      </nav>

      <div className="rounded-2xl border border-line bg-surface p-2 shadow-[0_1px_2px_rgba(28,37,64,.06)]">
        <SettingsList appAdmin={appAdmin} altAccount={altAccount} search={false} you={false} />
      </div>
    </div>
  );
}
