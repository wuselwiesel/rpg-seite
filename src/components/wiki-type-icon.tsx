import { CalendarDays, Gem, MapPin, PawPrint, ScrollText, User, Users, type LucideIcon } from "lucide-react";
import { wikiTypeOf, type WikiTypeIcon as IconName } from "@/lib/wiki-types";

const ICONS: Record<IconName, LucideIcon> = {
  "map-pin": MapPin,
  "paw-print": PawPrint,
  users: Users,
  user: User,
  "calendar-days": CalendarDays,
  "scroll-text": ScrollText,
  gem: Gem,
};

export function WikiTypeIcon({ type, className = "h-4 w-4" }: { type: string | null | undefined; className?: string }) {
  const t = wikiTypeOf(type);
  if (!t) return null;
  const Icon = ICONS[t.icon];
  return <Icon aria-hidden className={className} strokeWidth={1.75} />;
}

// Kleine Beschriftung „Ort“ mit Symbol, z. B. über dem Titel oder auf Karten.
export function WikiTypeBadge({ type }: { type: string | null | undefined }) {
  const t = wikiTypeOf(type);
  if (!t) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-fg-soft">
      <WikiTypeIcon type={type} className="h-3.5 w-3.5" />
      {t.label}
    </span>
  );
}
