import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getWorldRoles } from "@/lib/character-claims-data";
import type { World } from "@/lib/types";
import { RolesPanel } from "../roles-panel";

export const metadata = { title: "Angebote" };

// Nur die Rollen, die dir in dieser Welt angeboten wurden (Ziel der Benachrichtigung), ohne die ganze Weltseite
export default async function WorldOffersPage({ params }: PageProps<"/worlds/[id]/angebote">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: world } = await supabase.from("worlds").select("id, name").eq("id", id).maybeSingle<Pick<World, "id" | "name">>();
  if (!world) notFound();

  const { offersForMe } = await getWorldRoles(id, user.id, new Map());

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <Link href={`/worlds/${id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted transition hover:text-fg">
        <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        {world.name}
      </Link>
      {offersForMe.length > 0 ? (
        <RolesPanel isAdmin={false} roles={[]} offersForMe={offersForMe} members={[]} />
      ) : (
        <>
          <h1 className="mb-3 font-serif text-3xl text-fg">Angebote</h1>
          <p className="text-muted">Keine offenen Angebote.</p>
        </>
      )}
    </div>
  );
}
