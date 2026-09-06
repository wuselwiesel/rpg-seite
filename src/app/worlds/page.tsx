import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserWorlds } from "@/lib/worlds";
import { EnterWorldButton } from "./enter-world-button";

export default async function WorldsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const worlds = await getUserWorlds(user.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-fg">Deine Welten</h1>
          <p className="text-sm text-muted">Wähle eine Welt oder erschaffe eine neue.</p>
        </div>
        <Link
          href="/worlds/new"
          className="rounded-md bg-accent-strong px-4 py-2 text-sm font-medium text-on-accent-strong transition hover:opacity-90"
        >
          + Neue Welt
        </Link>
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
            <Link href={`/worlds/${world.id}`} className="flex-1">
              <p className="font-serif text-xl text-fg hover:text-accent">{world.name}</p>
              {world.description && (
                <p className="line-clamp-1 text-sm text-muted">{world.description}</p>
              )}
            </Link>
            <EnterWorldButton worldId={world.id} />
          </li>
        ))}
      </ul>
    </div>
  );
}
