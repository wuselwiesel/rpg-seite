import { BookOpen, Globe2, House, Inbox, MessageCircle, Newspaper, UserRound } from "lucide-react";
import type { NavIcon as NavIconName } from "@/lib/nav-model";
import { CharacterAvatar } from "./character-avatar";

const ICONS = { feed: House, story: BookOpen, welt: Globe2, chats: MessageCircle, news: Newspaper, chat: MessageCircle, feedback: Inbox, du: UserRound };

// Symbol eines Navigationseintrags; der Charakter-Eintrag zeigt das Bild des aktiven Charakters
export function NavIcon({ icon, className, avatar, avatarSize = 22 }: { icon: NavIconName; className: string; avatar?: { name: string; url: string | null } | null; avatarSize?: number }) {
  if (icon === "character") {
    return avatar ? <CharacterAvatar name={avatar.name} avatarUrl={avatar.url} size={avatarSize} /> : <UserRound className={className} strokeWidth={2} />;
  }
  const Icon = ICONS[icon];
  return <Icon className={className} strokeWidth={2} />;
}
