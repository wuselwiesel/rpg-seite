import Link from "next/link";
import { redirect } from "next/navigation";
import { Map as MapIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { getWikiMaps } from "@/lib/wiki-map-data";
import { WikiCrumbs } from "../wiki-crumbs";
import { NewMapForm } from "./new-map-form";

export default async function WikiMapsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const world = await getActiveWorld(user.id);
  if (!world) redirect("/worlds");
  const maps = await getWikiMaps(world.id);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <WikiCrumbs crumbs={[]} />
        <h1 className="flex items-center gap-3 font-serif text-4xl text-fg @xl:text-5xl">
          <MapIcon className="h-8 w-8 text-accent" strokeWidth={1.5} />
          Karten
        </h1>
        <p className="max-w-prose text-fg-soft">Lade Karten eurer Welt hoch und setze Pins, die auf Wiki-Seiten oder auf weitere Karten verweisen.</p>
      </header>

      {maps.length > 0 && (
        <ul className="grid gap-4 @xl:grid-cols-2 @4xl:grid-cols-3">
          {maps.map((m) => (
            <li key={m.id}>
              <Link href={`/wiki/karten/${m.id}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface transition hover:border-accent/50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.image_url} alt="" loading="lazy" className="aspect-[16/10] w-full bg-surface-2 object-cover" />
                <span className="flex flex-col gap-0.5 p-3">
                  <span className="font-serif text-xl text-fg">{m.title}</span>
                  {m.description && <span className="line-clamp-2 text-sm text-fg-soft">{m.description}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <NewMapForm />
    </div>
  );
}
