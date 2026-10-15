import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { World } from "@/lib/types";
import { EditWorldForm } from "./edit-world-form";
import { AdminNotifySwitches } from "./admin-notify-switches";
import { WorldAdminTabs } from "@/components/world-admin-tabs";
import { DeleteWorldButton } from "./delete-world-button";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getWorldChoiceLists } from "@/lib/choice-lists-data";
import { DEFAULT_TALENTS, parseTalentConfig } from "@/lib/talents";
import { DEFAULT_NATURES, parseNatureConfig } from "@/lib/natures";
import { parseMutedEvents } from "@/lib/world-admin-events";

export default async function EditWorldPage({ params }: PageProps<"/worlds/[id]/edit">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: world } = await supabase
    .from("worlds")
    .select("*")
    .eq("id", id)
    .maybeSingle<World>();

  if (!world) notFound();
  const isOwner = world.created_by === user.id;
  if (!isOwner) {
    const { data: me } = await supabase.from("world_members").select("role").eq("world_id", id).eq("user_id", user.id).maybeSingle();
    if (me?.role !== "admin") redirect(`/worlds/${id}`);
  }

  const lists = await getWorldChoiceLists(id);
  const { data: notifyPrefs } = await supabase.from("world_admin_notify_prefs").select("muted_events").eq("world_id", id).eq("user_id", user.id).maybeSingle<{ muted_events: string[] }>();
  const mutedEvents = parseMutedEvents(notifyPrefs?.muted_events);

  const talentsInitial = (world as unknown as { talent_config?: unknown }).talent_config
    ? parseTalentConfig((world as unknown as { talent_config?: unknown }).talent_config)
    : DEFAULT_TALENTS;

  const natureRaw = (world as unknown as { nature_config?: unknown }).nature_config;
  const naturesInitial = natureRaw != null ? parseNatureConfig(natureRaw) : DEFAULT_NATURES;

  const listsSlot = (
    <section id="listen" data-tour="welt-auswahllisten" className="mt-4 scroll-mt-20 border-t border-line pt-6">
      <h2 className="mb-3 font-serif text-xl text-fg">Auswahllisten</h2>
      <ul className="flex flex-col gap-2">
        {lists.map((l) => (
          <li key={l.id}>
            <Link
              href={`/worlds/${world.id}/listen#liste-${l.id}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-fg transition hover:border-accent"
            >
              <span className="min-w-0 truncate">{l.label}</span>
              <span className="flex shrink-0 items-center gap-1 text-muted">
                {l.mode === "dropdown" ? `${l.options.length} Einträge` : "Freitext"}
                <ChevronRight className="h-4 w-4" strokeWidth={2} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href={`/worlds/${world.id}/listen`}
        className="mt-3 inline-block rounded-full border border-line px-4 py-1.5 text-sm font-medium text-fg-soft transition hover:border-accent hover:text-accent"
      >
        {lists.length > 0 ? "Alle bearbeiten" : "Liste anlegen"}
      </Link>
    </section>
  );

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="mb-4 font-serif text-3xl text-fg">{world.name}</h1>
      <WorldAdminTabs worldId={world.id} />

      <EditWorldForm world={world} welcomeInitial={world.welcome_html ?? ""} talentsInitial={talentsInitial} naturesInitial={naturesInitial} listsSlot={listsSlot} notifySlot={<AdminNotifySwitches worldId={world.id} mutedInitial={mutedEvents} />} />

      {isOwner && (
        <div data-tour="welt-loeschen" className="mt-8 border-t border-line pt-6">
          <p className="mb-3 text-sm text-muted">
            Das Löschen entfernt auch alle Charaktere, Beiträge und die Story dieser Welt – für alle
            Mitglieder, unwiderruflich.
          </p>
          <DeleteWorldButton worldId={world.id} worldName={world.name} />
        </div>
      )}
    </div>
  );
}
