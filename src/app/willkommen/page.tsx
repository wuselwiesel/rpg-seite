import Link from "next/link";
import { redirect } from "next/navigation";
import { Compass, FlaskConical, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserWorlds } from "@/lib/worlds";
import { JoinOrRequestButton } from "@/app/worlds/join-or-request-button";
import { EnterWorldButton } from "@/app/worlds/enter-world-button";
import { InviteLinkForm } from "./invite-link-form";
import { PendingWorldInvites } from "@/app/worlds/world-invites";

export const metadata = { title: "Willkommen" };

type DemoRow = { id: string; name: string; is_demo: boolean; is_member: boolean };

// Erste Seite nach der Anmeldung: drei Wege in eine Welt.
export default async function WelcomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [worlds, { data: overview }] = await Promise.all([getUserWorlds(user.id), supabase.rpc("public_worlds_overview")]);
  const demo = ((overview ?? []) as DemoRow[]).find((w) => w.is_demo) ?? null;

  const card = "flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5";
  const title = "flex items-center gap-2 font-serif text-xl text-fg";

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-10">
      <h1 className="font-serif text-3xl text-fg">Willkommen bei Wortwinkel</h1>

      <PendingWorldInvites />

      {demo && (
        <section className={card} aria-label="Übungswelt">
          <h2 className={title}>
            <FlaskConical className="h-5 w-5 text-accent" strokeWidth={2} />
            {demo.name}
          </h2>
          <p className="text-sm text-fg-soft">Ausprobieren</p>
          <div className="flex">{demo.is_member ? <EnterWorldButton worldId={demo.id} /> : <JoinOrRequestButton worldId={demo.id} joinMode="open" />}</div>
        </section>
      )}

      <section className={card} aria-label="Welten entdecken">
        <h2 className={title}>
          <Compass className="h-5 w-5 text-accent" strokeWidth={2} />
          Welten entdecken
        </h2>
        <div>
          <Link
            href="/worlds/entdecken"
            className="inline-block rounded-full border border-line px-4 py-1.5 text-sm font-medium text-fg-soft transition hover:border-accent hover:text-accent"
          >
            Öffentliche Welten ansehen
          </Link>
        </div>
      </section>

      <section className={card} aria-label="Eigene Welt">
        <h2 className={title}>
          <Sparkles className="h-5 w-5 text-accent" strokeWidth={2} />
          Eigene Welt erschaffen
        </h2>
        <div>
          <Link
            href="/worlds/new?welcome=1"
            className="inline-block rounded-full border border-line px-4 py-1.5 text-sm font-medium text-fg-soft transition hover:border-accent hover:text-accent"
          >
            Welt erschaffen
          </Link>
        </div>
      </section>

      <InviteLinkForm />

      {worlds.length > 0 && (
        <p className="text-sm">
          <Link href="/worlds" className="text-accent hover:underline">
            Zu deinen Welten
          </Link>
        </p>
      )}
    </div>
  );
}
