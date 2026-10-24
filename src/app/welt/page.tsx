import { redirect } from "next/navigation";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorld } from "@/lib/worlds";
import { getWorldDiceEnabled } from "@/lib/world-dice";
import { getWorldMembers } from "@/lib/world-members";
import { WorldCover } from "@/components/world-cover";
import { WorldTiles, type WorldTileDef } from "./world-tiles";

export const metadata = { title: "Welt" };

// Alles, was zur Welt gehört, an einem Ort (Variante D): Wiki, Charaktere, Beziehungen, Karten, Zeit, Würfe, Mitglieder, Welt-Chat
export default async function WorldPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const world = await getActiveWorld(user.id);
  if (!world) redirect("/worlds");

  const [diceEnabled, members, { data: membership }, { data: worldChat }] = await Promise.all([
    getWorldDiceEnabled(world.id),
    getWorldMembers(world.id),
    supabase.from("world_members").select("role").eq("world_id", world.id).eq("user_id", user.id).maybeSingle(),
    supabase.from("account_chats").select("id").eq("kind", "world").eq("world_id", world.id).maybeSingle(),
  ]);
  const canManage = world.created_by === user.id || membership?.role === "admin";

  const tiles: WorldTileDef[] = [
    { id: "wiki", label: "Wiki", href: "/wiki" },
    { id: "charaktere", label: "Charaktere", href: "/story/charaktere" },
    { id: "beziehungen", label: "Beziehungen", href: "/characters/relationships" },
    { id: "karten", label: "Karten", href: "/wiki/karten" },
    { id: "zeitleiste", label: "Zeitleiste", href: "/wiki/zeitleiste" },
    { id: "kalender", label: "Kalender", href: "/wiki/kalender" },
    ...(diceEnabled ? [{ id: "wuerfe", label: "Würfelverlauf", href: "/story/wuerfe" } as const] : []),
  ];
  // Hinter der Kachel „Mitglieder“
  const after: WorldTileDef[] = [
    ...(worldChat ? [{ id: "chat", label: "Welt-Chat", href: `/redaktion/chat/${worldChat.id}` } as const] : []),
    ...(canManage ? [{ id: "verwalten", label: "Welt verwalten", href: `/worlds/${world.id}` } as const] : []),
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10 xl:max-w-3xl">
      <div className="mb-5 flex items-center gap-3">
        <WorldCover name={world.name} coverUrl={world.cover_image_url} className="h-11 w-11 shrink-0 rounded-xl text-base" />
        <h1 className="min-w-0 truncate font-serif text-3xl text-fg">{world.name}</h1>
      </div>
      <form action="/search" role="search" className="mb-5">
        <label className="flex h-11 items-center gap-2.5 rounded-full border border-line bg-surface px-4 text-muted focus-within:border-accent">
          <Search className="h-[18px] w-[18px] shrink-0" strokeWidth={2} aria-hidden />
          <input type="search" name="q" placeholder={`In ${world.name} suchen`} aria-label="Suchen" className="min-w-0 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-muted" />
        </label>
      </form>
      <WorldTiles tiles={tiles} after={after} members={members} selfId={user.id} />
    </div>
  );
}
