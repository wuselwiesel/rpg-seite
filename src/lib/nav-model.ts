import type { AppMode } from "./app-mode";

// Eine Quelle für die Einträge der Handy-Leiste und der Seitenleiste (Variante D, docs/plan-struktur-d.md).
// Die Mitte („+ Erstellen“) setzen die Leisten selbst ein; am Computer kommt „Notizen“ dazu.

export type NavIcon = "feed" | "story" | "welt" | "chats" | "news" | "chat" | "feedback" | "du" | "character";

export type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: NavIcon;
  // Nur genau dieser Pfad zählt als aktiv (Feed, Neuigkeiten)
  exact?: boolean;
  // Weitere Pfade, bei denen der Eintrag aktiv ist (Seiten hinter den Kacheln der Welt-Seite)
  also?: string[];
  // Unterseiten, die nicht mitzählen (Würfelverlauf und Charaktere unter /story gehören zur Welt)
  exclude?: string[];
  // Zahl am Eintrag
  badge?: "chats" | "tickets";
};

export type NavContext = {
  activeCharacter: { id: string; name: string } | null;
};

// Seiten, die über die Welt-Seite erreichbar sind und dort als „Welt“ zählen
export const WORLD_PATHS = ["/welt", "/wiki", "/characters/relationships", "/story/wuerfe", "/story/charaktere"];

// Kurzname für den Tab: der erste Teil des Namens („Lyra Nachtfeder“ → „Lyra“)
export function shortName(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? "";
  return first || name;
}

function characterItem(ctx: NavContext): NavItem {
  const c = ctx.activeCharacter;
  if (!c) return { id: "character", label: "Charakter", href: "/characters/new", icon: "character" };
  return { id: "character", label: shortName(c.name), href: `/characters/${c.id}`, icon: "character" };
}

const WELT: NavItem = { id: "welt", label: "Welt", href: "/welt", icon: "welt", also: WORLD_PATHS.filter((p) => p !== "/welt") };
const CHATS: NavItem = { id: "chats", label: "Chats", href: "/chats", icon: "chats", badge: "chats" };

export function navItems(mode: AppMode, ctx: NavContext): NavItem[] {
  if (mode === "redaktion") {
    return [
      { id: "news", label: "Neuigkeiten", href: "/redaktion", icon: "news", exact: true },
      { id: "chat", label: "Chat", href: "/redaktion/chat", icon: "chat" },
      { id: "feedback", label: "Feedback", href: "/redaktion/tickets", icon: "feedback", badge: "tickets" },
      { id: "du", label: "Du", href: "/redaktion/du", icon: "du", also: ["/redaktion/profil", "/redaktion/verlauf"] },
    ];
  }
  const first: NavItem =
    mode === "story"
      ? { id: "story", label: "Story", href: "/story", icon: "story", exclude: ["/story/wuerfe", "/story/charaktere"] }
      : { id: "feed", label: "Feed", href: "/", icon: "feed", exact: true };
  return [first, WELT, CHATS, characterItem(ctx)];
}

const under = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`);

export function isNavActive(item: NavItem, pathname: string | null): boolean {
  if (!pathname) return false;
  if (item.also?.some((a) => under(pathname, a))) return true;
  if (item.exact) return pathname === item.href;
  if (!under(pathname, item.href)) return false;
  return !item.exclude?.some((x) => under(pathname, x));
}
