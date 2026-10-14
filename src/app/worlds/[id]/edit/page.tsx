import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { World } from "@/lib/types";
import { EditWorldForm } from "./edit-world-form";
import { DeleteWorldButton } from "./delete-world-button";
import { TalentEditor } from "./talent-editor";
import { WelcomeEditor } from "./welcome-editor";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getWorldChoiceLists } from "@/lib/choice-lists-data";
import { DEFAULT_TALENTS, parseTalentConfig } from "@/lib/talents";

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

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="mb-1 font-serif text-3xl text-fg">Welt bearbeiten</h1>
      <p className="mb-6 text-sm text-muted">
        Titelbild, Name und Beschreibung von {world.name}.
      </p>

      <EditWorldForm world={world} />

      <section className="mt-8 border-t border-line pt-6">
        <h2 data-tour="welt-willkommen" className="mb-3 font-serif text-xl text-fg">Willkommen</h2>
        <WelcomeEditor worldId={world.id} initial={world.welcome_html ?? ""} />
      </section>

      <section data-tour="welt-auswahllisten" className="mt-8 border-t border-line pt-6">
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

      {world.dice_enabled !== false && (
      <section className="mt-8 border-t border-line pt-6">
        <h2 data-tour="welt-talente" className="mb-3 font-serif text-xl text-fg">Talente</h2>
        <TalentEditor
          worldId={world.id}
          initial={(world as unknown as { talent_config?: unknown }).talent_config ? parseTalentConfig((world as unknown as { talent_config?: unknown }).talent_config) : DEFAULT_TALENTS}
        />
      </section>
      )}

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
