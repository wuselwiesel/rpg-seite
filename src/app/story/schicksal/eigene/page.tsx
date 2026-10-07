import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import type { CustomFateRow } from "@/lib/fate-custom";
import { CustomFateManager } from "./manager";

export default async function EigeneSchicksalePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const world = await getActiveWorld(user.id);
  if (!world) redirect("/worlds");

  const { data } = await supabase
    .from("world_custom_fates")
    .select("id, category, severity, text, targets, created_by")
    .eq("world_id", world.id)
    .order("created_at", { ascending: false })
    .returns<CustomFateRow[]>();

  return (
    <div className="mx-auto max-w-2xl xl:max-w-3xl 2xl:max-w-4xl px-4 py-6 sm:py-10">
      <Link href="/story/schicksal" className="mb-3 inline-flex items-center gap-1 text-sm text-muted transition hover:text-fg">
        <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        Schicksalswürfel
      </Link>
      <h1 className="mb-1 font-serif text-3xl text-fg">Eigene Schicksale</h1>
      <p className="mb-6 text-sm text-muted">{world.name}</p>
      <CustomFateManager fates={data ?? []} currentUserId={user.id} isWorldOwner={world.created_by === user.id} />
    </div>
  );
}
