import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserWorlds } from "@/lib/worlds";
import { WorldCover } from "@/components/world-cover";
import { EnterWorldButton } from "./enter-world-button";

export default async function WorldsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const worlds = await getUserWorlds(user.id);

  return (
    <div className="mx-auto max-w-2xl xl:max-w-3xl 2xl:max-w-4xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div>
          <h1 className="font-serif text-3xl text-fg">Deine Welten</h1>
          <p className="text-sm text-muted">Wähle eine Welt oder erschaffe eine neue.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/search?tab=worlds"
            className="rounded-md border border-line px-4 py-2 text-sm font-medium text-fg-soft transition hover:border-accent hover:text-accent"
          >
            Welten entdecken
          </Link>
          <Link
            href="/worlds/new"
            className="rounded-md bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90"
          >
            + Neue Welt
          </Link>
        </div>
      </div>

      {worlds.length === 0 && (
        <p className="text-muted">
          Du bist noch in keiner Welt.{" "}
          <Link href="/worlds/new" className="text-accent hover:underline">
            Erschaffe deine erste.
          </Link>
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {worlds.map((world) => (
          <li
            key={world.id}
            className="flex items-center justify-between gap-4 rounded-lg border border-line bg-surface p-4"
          >
            <Link href={`/worlds/${world.id}`} className="flex min-w-0 flex-1 items-center gap-4">
              <WorldCover
                name={world.name}
                coverUrl={world.cover_image_url}
                className="h-14 w-14 shrink-0 text-base"
              />
              <div className="min-w-0">
                <p className="truncate font-serif text-xl text-fg hover:text-accent">{world.name}</p>
                {world.description && (
                  <p className="line-clamp-1 text-sm text-muted">{world.description}</p>
                )}
              </div>
            </Link>
            <EnterWorldButton worldId={world.id} />
          </li>
        ))}
      </ul>
    </div>
  );
}
